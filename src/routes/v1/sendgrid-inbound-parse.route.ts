import { Router, Request, Response } from 'express';
import multer from 'multer';
// DISABLED (AI Discovery Agent): the original handler (sendgrid-inbound-parse.controller.ts) fed the discovery agent.
// import { handleInboundParse } from '../../controllers/v1/sendgrid-inbound-parse.controller';
// Stub: the URL still answers 200 so SendGrid does not keep retrying; the email is ignored and nothing is saved.
const handleInboundParse = (_req: Request, res: Response) => {
  res.status(200).json({ discovery: 'disabled' });
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const sendGridInboundParseRouter = Router();

// SendGrid Inbound Parse webhook endpoint
// SendGrid POSTs multipart/form-data with parsed email fields
sendGridInboundParseRouter.post('/inbound-parse', upload.none(), handleInboundParse);

export default sendGridInboundParseRouter;
