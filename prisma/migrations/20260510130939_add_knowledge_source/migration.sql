/*
  Warnings:

  - Added the required column `updatedAt` to the `KnowledgeFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KnowledgeFile" ADD COLUMN     "docUrl" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "mimeType" SET DEFAULT 'text/plain';
