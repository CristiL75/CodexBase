import mongoose, { Schema, Document } from "mongoose";
import { maskSensitiveData, containsSensitiveData } from "../utils/uriSanitizer";

export interface IFile extends Document {
  repository: mongoose.Types.ObjectId;
  branch: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: mongoose.Types.ObjectId;
}

const FileSchema = new Schema<IFile>({
  repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  branch: { type: String, default: "main" },
  name: { 
    type: String, 
    required: true,
    set: function(value: string) {
      return maskSensitiveData(value);
    }
  },
  content: { 
    type: String, 
    default: "",
    set: function(value: string) {
      return value ? maskSensitiveData(value) : value;
    }
  },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware pentru validarea și logarea datelor sensibile
FileSchema.pre('save', function(next) {
  const file = this as IFile;
  
  // Verifică și loghează dacă au fost detectate date sensibile
  const sensitiveFields = [];
  
  if (containsSensitiveData(file.name)) {
    sensitiveFields.push('name');
  }
  
  if (file.content && containsSensitiveData(file.content)) {
    sensitiveFields.push('content');
  }
  
  if (sensitiveFields.length > 0) {
    console.warn(`[Security] Sensitive data detected and masked in file ${file.name} (repo: ${file.repository}) fields: ${sensitiveFields.join(', ')}`);
  }
  
  next();
});

// Pre-update middleware pentru actualizări
FileSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  const update = this.getUpdate() as any;
  
  if (update.$set) {
    if (update.$set.name) {
      update.$set.name = maskSensitiveData(update.$set.name);
    }
    
    if (update.$set.content) {
      update.$set.content = maskSensitiveData(update.$set.content);
    }
  }
  
  // Pentru actualizări directe
  if (update.name) {
    update.name = maskSensitiveData(update.name);
  }
  
  if (update.content) {
    update.content = maskSensitiveData(update.content);
  }
  
  next();
});

export const File = mongoose.model<IFile>("File", FileSchema);