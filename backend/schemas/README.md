Mapping schema
===============

This folder contains the JSON Schema for the PDF->certificate mapping produced by the backend mapper.

File: `mapping.schema.json`
- Use this schema to validate the `mapping` object returned by `/api/map`, `/api/mapping/:id`, or stored in the `uploads.mapping` DB column.
- Fields follow the pattern:
  - field: { value: string|array, confidence: number (0..1), sources?: [ { page, itemIndex, bbox?, text } ] }
- Dates prefer ISO `YYYY-MM-DD` in `value` when possible; the schema accepts other strings but the normalization logic should prefer ISO.

Usage
-----
- Backend: validate mapping before storing, and ensure normalized date strings for `startDate`/`endDate`/`issuedDate`.
- Frontend: import `src/types/mapping.ts` to obtain TypeScript types for mapping and to guide the UI when applying mapped values to form inputs.
