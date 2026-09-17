import { Router } from 'express';
import multer from 'multer';
import { handleInboundParse } from '../../controllers/v1/sendgrid-inbound-parse.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const sendGridInboundParseRouter = Router();

// SendGrid Inbound Parse webhook endpoint
// SendGrid POSTs multipart/form-data with parsed email fields
sendGridInboundParseRouter.post('/inbound-parse', upload.none(), handleInboundParse);

export default sendGridInboundParseRouter;
