import "reflect-metadata";
import { getSequelize } from "./src/utils/sequelize";
import { MissingInfoRequest } from "./src/models/v1/missing-info-request.model";
import { MissingInfoResponse } from "./src/models/v1/missing-info-response.model";
import { MissingInfoTemplate } from "./src/models/v1/missing-info-template.model";
import { MissingInfoTemplateField } from "./src/models/v1/missing-info-template-field.model";
import { User } from "./src/models/v1/user.model";

async function main() {
  const seq = getSequelize();
  await seq.authenticate();
  console.log("connected");

  const requestId = "044dac07-c064-4718-b240-c6589916a068";
  const request = await MissingInfoRequest.findByPk(requestId, {
    include: [
      { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName"] },
      { model: MissingInfoTemplate, attributes: ["id", "name", "type"],
        include: [{ model: MissingInfoTemplateField, as: "fields" }] },
    ],
  });

  const template = (request as any).template;
  const templateFields = template?.fields || [];
  console.log("template fields loaded:", templateFields.length);
  for (const f of templateFields) {
    console.log(`  ${f.fieldName} -> ${f.fieldType}`);
  }

  const responses = await MissingInfoResponse.findAll({ where: { requestId }, order: [["createdAt", "ASC"]] });
  const fieldMap = new Map<string, { fieldLabel: string; fieldType: string }>();
  for (const f of templateFields) {
    fieldMap.set(f.id, { fieldLabel: f.fieldLabel, fieldType: f.fieldType });
  }
  for (const r of responses as any[]) {
    const info = fieldMap.get(r.fieldId) || { fieldLabel: r.fieldLabel || r.fieldName || "Unknown", fieldType: "text" };
    console.log(`  response ${r.fieldId} -> fieldType=${info.fieldType} value=${String(r.fieldValue).slice(0, 60)}`);
  }

  await seq.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});