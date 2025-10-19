export type MappingSource = {
  page: number;
  itemIndex: number;
  bbox?: { x: number; y: number; w: number; h: number };
  text?: string;
};

export type FieldString = {
  value: string;
  original?: string;
  format?: string;
  confidence: number; // 0.0 - 1.0
  sources?: MappingSource[];
};

export type FieldStringArray = {
  value: string[];
  original?: string;
  format?: string;
  confidence: number;
  sources?: MappingSource[];
};

export type FieldDate = FieldString & { value: string };

export type PdfMapping = Partial<{
  title: FieldString;
  issuer: FieldString;
  usefulLinks: FieldStringArray;
  startDate: FieldDate;
  endDate: FieldDate;
  issuedDate: FieldDate;
  description: FieldString;
  skills: FieldStringArray;
  recipient: FieldString;
  recipientAddress: FieldString;
}>;

export default PdfMapping;
