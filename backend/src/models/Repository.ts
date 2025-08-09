import mongoose, { Schema, Document } from "mongoose";
import { maskSensitiveData, containsSensitiveData } from "../utils/uriSanitizer";

export interface IRepository extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId; // creatorul repo-ului
  collaborators: mongoose.Types.ObjectId[]; // membrii repo-ului
  isPrivate: boolean;
  starredBy: mongoose.Types.ObjectId[]; // userii care au dat stea
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>({
  name: { 
    type: String, 
    required: true,
    set: function(value: string) {
      return maskSensitiveData(value);
    }
  },
  description: {
    type: String,
    set: function(value: string) {
      return value ? maskSensitiveData(value) : value;
    }
  },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }], // membrii
  isPrivate: { type: Boolean, default: false },
  starredBy: [{ type: Schema.Types.ObjectId, ref: "User" }], // stele
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware pentru validarea și logarea datelor sensibile
RepositorySchema.pre('save', function(next) {
  const repo = this as IRepository;
  
  // Verifică și loghează dacă au fost detectate date sensibile
  const sensitiveFields = [];
  
  if (containsSensitiveData(repo.name)) {
    sensitiveFields.push('name');
  }
  
  if (repo.description && containsSensitiveData(repo.description)) {
    sensitiveFields.push('description');
  }
  
  if (sensitiveFields.length > 0) {
    console.warn(`[Security] Sensitive data detected and masked in repository ${repo._id} fields: ${sensitiveFields.join(', ')}`);
  }
  
  next();
});

// Pre-update middleware pentru actualizări
RepositorySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  const update = this.getUpdate() as any;
  
  if (update.$set) {
    if (update.$set.name) {
      update.$set.name = maskSensitiveData(update.$set.name);
    }
    
    if (update.$set.description) {
      update.$set.description = maskSensitiveData(update.$set.description);
    }
  }
  
  // Pentru actualizări directe
  if (update.name) {
    update.name = maskSensitiveData(update.name);
  }
  
  if (update.description) {
    update.description = maskSensitiveData(update.description);
  }
  
  next();
});

export const Repository = mongoose.model<IRepository>("Repository", RepositorySchema);