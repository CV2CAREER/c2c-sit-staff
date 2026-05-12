import { drive_v3, google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { authorize } from '../config/googleDrive';
import bucket from '../config/firebase';
import ExcelJS from 'exceljs';
import { getServiceLogger } from './createLogger';
import ErrorHandler from './errorHandler';
import { getMimeType, getParentFolderId } from './gDriveFns';

const logger = getServiceLogger('gdrive-client');

/**
 * Get a client folder from Google Drive
 * @param drive - Google Drive instance
 * @param clientFolderName - Name of the client folder
 * @param clientSubstatus - Whether the client has paid
 * @returns The client folder or null if not found
 */
export async function getClientFolder(
  drive: drive_v3.Drive,
  clientFolderName: string,
  clientSubstatus: boolean
): Promise<drive_v3.Schema$File | null> {
  const folderId = getParentFolderId(clientSubstatus);
  logger.debug(`Looking for folder '${clientFolderName}' under parent ID: ${folderId}`);

  try {
    const { data: clientFolderList } = await drive.files.list({
      includeTeamDriveItems: true,
      supportsTeamDrives: true,
      q: `'${folderId}' in parents and name='${clientFolderName}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    });

    logger.debug(`Client folder list response: ${JSON.stringify(clientFolderList)}`);

    if (!clientFolderList.files || clientFolderList.files.length === 0) {
      logger.warn(`No folder found with name '${clientFolderName}'`);
      return null;
    }

    const folder = clientFolderList.files[0];
    logger.info(`Found folder: ${folder.name} (ID: ${folder.id})`);
    return folder as drive_v3.Schema$File;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error retrieving client folder: ${errorMessage}`);
    throw new ErrorHandler(`Error retrieving client folder: ${errorMessage}`, 500);
  }
}

/**
 * Create a client folder in Google Drive
 * @param drive - Google Drive instance
 * @param clientFolderName - Name for the new folder
 * @param clientSubstatus - Whether the client has paid
 * @returns The created folder
 */
export async function createClientFolder(
  drive: drive_v3.Drive,
  clientFolderName: string,
  clientSubstatus: boolean
): Promise<drive_v3.Schema$File> {
  const folderId = getParentFolderId(clientSubstatus);

  try {
    logger.debug(`Creating client folder: ${clientFolderName}`);
    
    const { data: clientFolder } = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: clientFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId!],
      },
      fields: 'id, name',
    });

    logger.info(`Client folder created: ${clientFolder.name} (ID: ${clientFolder.id})`);
    return clientFolder;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error creating client folder: ${errorMessage}`);
    throw new ErrorHandler(`Error creating client folder: ${errorMessage}`, 500);
  }
}

/**
 * Download a file from Firebase Storage
 * @param sourcePath - Path in Firebase Storage
 * @param destinationPath - Local path to save the file
 */
export async function downloadFileFromFirebase(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  try {
    logger.debug(`Downloading from Firebase: ${sourcePath} to ${destinationPath}`);
    await bucket.file(sourcePath).download({ destination: destinationPath });
    logger.info(`Successfully downloaded file from Firebase: ${sourcePath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to download from Firebase: ${errorMessage}`);
    throw new ErrorHandler(`Failed to download from Firebase: ${errorMessage}`, 500);
  }
}

/**
 * Upload a file to Google Drive from Firebase
 * @param clientFolderId - ID of the client folder in Google Drive
 * @param clientFile - File object containing filename and cloudFilename
 * @returns The uploaded file data
 */
async function uploadFileToDrive(
  clientFolderId: string,
  clientFile: any
): Promise<drive_v3.Schema$File | undefined> {
  if (!clientFile || !clientFile.filename || !clientFile.cloudFilename) {
    logger.error(`Invalid clientFile object: ${JSON.stringify(clientFile)}`);
    throw new ErrorHandler('Invalid clientFile: missing filename or cloudFilename', 400);
  }

  const { filename, cloudFilename } = clientFile;
  const cwd = process.cwd();
  const localFilePath =
    process.env.NODE_ENV === 'development'
      ? path.join(cwd, `tmp/${filename}`)
      : `/tmp/${filename}`;
  const cloudFilePath = `${process.env.STORAGE_BUCKET}/${cloudFilename}`;

  try {
    logger.debug(`Downloading ${cloudFilename} from Firebase to ${localFilePath}`);
    await downloadFileFromFirebase(cloudFilePath, localFilePath);
    logger.info(`File downloaded from Firebase: ${filename}`);

    const fileExtension = path.extname(localFilePath).toLowerCase();
    const mimeType = getMimeType(fileExtension);

    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: filename,
      parents: [clientFolderId],
    };

    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(localFilePath),
    };

    const { data } = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents, webContentLink, webViewLink',
      supportsAllDrives: true,
    });

    // Clean up local file
    fs.unlinkSync(localFilePath);
    logger.info(`File uploaded to Drive: ${filename} (ID: ${data.id})`);
    
    return data;
  } catch (error) {
    // Clean up local file on error
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to upload ${filename} to Drive: ${errorMessage}`);
    throw new ErrorHandler(`Failed to upload file to Drive: ${errorMessage}`, 500);
  }
}

/**
 * Write client data to an Excel file
 * @param clientData - Client data object to write
 * @param filename - Name for the Excel file
 * @returns Path to the created file
 */
export const fileWriter = async (clientData: any, filename: string): Promise<string> => {
  const cwd = process.cwd();
  const filePath =
    process.env.NODE_ENV === 'development'
      ? path.join(cwd, `tmp/${filename}`)
      : `/tmp/${filename}`;

  try {
    logger.debug(`Writing client data to Excel: ${filename}`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    const headers = Object.keys(clientData);
    const cells = Object.values(clientData);

    worksheet.addRow(headers);
    worksheet.addRow(cells);

    await workbook.xlsx.writeFile(filePath);
    logger.info(`Client data written to Excel: ${filePath}`);
    
    return filePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to write Excel file: ${errorMessage}`);
    throw new ErrorHandler(`Failed to write Excel file: ${errorMessage}`, 500);
  }
};

/**
 * Upload client details to Google Drive as an Excel file
 * @param clientFolderName - Name of the client folder
 * @param clientDetails - Client details object
 * @returns The uploaded file data
 */
export async function uploadClientDetailsToDrive(
  clientFolderName: string,
  clientDetails: any
): Promise<drive_v3.Schema$File | undefined> {
  try {
    logger.debug(`Uploading client details for: ${clientFolderName}`);
    
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    const clientSubstatus = clientDetails.isUserSubscribed;
    const clientFolder = await getClientFolder(drive, clientFolderName, clientSubstatus);

    if (!clientFolder) {
      logger.warn(`Client folder ${clientFolderName} not found for details upload`);
      return;
    }

    // Process client details
    const processedClientDetails: Record<string, any> = {};
    for (const [key, value] of Object.entries(clientDetails)) {
      processedClientDetails[key] = Array.isArray(value) ? value.join(',') : value;
    }

    const filepath = await fileWriter(processedClientDetails, `${clientFolderName}.xlsx`);

    const fileMetadata = {
      name: `${clientFolderName}.xlsx`,
      parents: [clientFolder.id!],
    };

    const media = {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(filepath),
    };

    const { data } = await drive.files.create({
      supportsAllDrives: true,
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents, webContentLink, webViewLink',
    });

    // Clean up temp file
    fs.unlinkSync(filepath);
    logger.info(`Client details uploaded for: ${clientFolderName}`);
    
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to upload client details: ${errorMessage}`);
    throw new ErrorHandler(`Failed to upload client details: ${errorMessage}`, 500);
  }
}

/**
 * Upload files to Google Drive for a client
 * @param clientFolderName - Name for the client folder
 * @param filesToUpload - Array of files to upload
 * @param clientDetails - Client details object
 * @returns Boolean indicating success
 */
export async function uploadToDrive(
  clientFolderName: string,
  filesToUpload: any[],
  clientDetails: any
): Promise<boolean> {
  const tmpDir = process.env.NODE_ENV === 'development'
    ? path.join(process.cwd(), 'tmp')
    : '/tmp';
  
  logger.info(`Starting upload to Drive for client: ${clientFolderName}`);
  logger.debug(`Temp directory: ${tmpDir}`);

  try {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    const clientFolder = await createClientFolder(drive, clientFolderName, clientDetails.isUserSubscribed);
    logger.info(`Client folder created: ${clientFolder.name}`);

    // Upload client documents
    let counter = 0;
    for (const clientFile of filesToUpload) {
      const fileToUpload = clientFile.document?.[0] || clientFile[0];
      await uploadFileToDrive(clientFolder.id!, fileToUpload);
      logger.info(`File ${++counter}: ${fileToUpload.filename} uploaded`);
    }

    // Upload client basic details
    logger.debug('Uploading client details to Drive');
    clientDetails['Payment Status'] = clientDetails.isUserSubscribed ? 'Paid' : 'Not Paid';
    const result = await uploadClientDetailsToDrive(clientFolderName, clientDetails);
    logger.info(`Client details uploaded: ${result?.name}`);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Upload to Drive failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Update files in Google Drive for a client
 * @param clientFolderName - Name of the client folder
 * @param filesToUpdate - Array of files to update
 * @param clientDetails - Client details object
 * @returns Boolean indicating success
 */
export async function updateInDrive(
  clientFolderName: string,
  filesToUpdate: any[],
  clientDetails: any
): Promise<boolean> {
  logger.info(`Starting update in Drive for client: ${clientFolderName}`);
  
  try {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    const clientFolder = await getClientFolder(
      drive,
      clientFolderName,
      clientDetails.isUserSubscribed
    );

    if (!clientFolder) {
      logger.error(`Client folder not found: ${clientFolderName}`);
      return false;
    }

    // Upload updated documents (we don't replace, we add)
    let counter = 0;
    for (const clientFile of filesToUpdate) {
      const fileToUpload = clientFile.document?.[0] || clientFile[0];
      await uploadFileToDrive(clientFolder.id!, fileToUpload);
      logger.info(`File ${++counter}: ${fileToUpload.filename} updated`);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Update in Drive failed: ${errorMessage}`);
    return false;
  }
}