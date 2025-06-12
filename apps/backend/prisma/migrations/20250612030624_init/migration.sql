-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waypoint" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "photos" TEXT[],
    "icon" TEXT,
    "timestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLng" DOUBLE PRECISION NOT NULL,
    "endLat" DOUBLE PRECISION NOT NULL,
    "endLng" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "distance" DOUBLE PRECISION,
    "duration" DOUBLE PRECISION,
    "polyline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Waypoint_routeId_idx" ON "Waypoint"("routeId");

-- CreateIndex
CREATE INDEX "Segment_routeId_idx" ON "Segment"("routeId");

-- AddForeignKey
ALTER TABLE "Waypoint" ADD CONSTRAINT "Waypoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
