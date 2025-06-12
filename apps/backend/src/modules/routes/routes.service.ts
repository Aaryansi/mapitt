import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    waypoints: Array<{
      lat: number;
      lng: number;
      name?: string;
    }>;
  }) {
    return this.prisma.route.create({
      data: {
        name: data.name,
        description: data.description,
        waypoints: {
          create: data.waypoints.map((wp, index) => ({
            order: index,
            latitude: wp.lat,
            longitude: wp.lng,
            name: wp.name,
          })),
        },
      },
      include: {
        waypoints: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
  }) {
    const { skip = 0, take = 10 } = params;
    
    const [routes, total] = await Promise.all([
      this.prisma.route.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          waypoints: {
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.route.count(),
    ]);

    return { routes, total };
  }

  async findAll(params: {
    skip?: number;
    take?: number;
  }) {
    return this.findMany(params);
  }

  async findOne(id: string) {
    return this.prisma.route.findUnique({
      where: { id },
      include: {
        waypoints: {
          orderBy: { order: 'asc' },
        },
        segments: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async update(id: string, data: Prisma.RouteUpdateInput) {
    return this.prisma.route.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.route.delete({
      where: { id },
    });
  }

  async calculateSegments(routeId: string) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: {
        waypoints: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!route || route.waypoints.length < 2) {
      throw new Error('Route must have at least 2 waypoints');
    }

    const segments = [];
    
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const start = route.waypoints[i];
      const end = route.waypoints[i + 1];
      
      segments.push({
        routeId,
        order: i,
        startLat: start.latitude,
        startLng: start.longitude,
        endLat: end.latitude,
        endLng: end.longitude,
        mode: 'driving',
      });
    }

    await this.prisma.segment.deleteMany({
      where: { routeId },
    });

    return this.prisma.segment.createMany({
      data: segments,
    });
  }
}