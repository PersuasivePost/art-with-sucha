-- CreateTable
CREATE TABLE "public"."Section" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "tags" TEXT[],
    "imageUrl" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Section_name_parentId_key" ON "public"."Section"("name", "parentId");

-- AddForeignKey
ALTER TABLE "public"."Section" ADD CONSTRAINT "Section_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
