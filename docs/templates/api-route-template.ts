import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Define your Zod schema for validation
const requestSchema = z.object({
  // Define your request schema here
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});

const responseSchema = z.object({
  // Define your response schema here
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  createdAt: z.string(),
});

/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Brief description of what this endpoint does
 *     description: |
 *       Detailed description of the endpoint functionality.
 *       Explain what it does, when to use it, and any important behavior.
 *     tags:
 *       - Your Category
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Maximum number of items to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *           example: 20
 *       - in: query
 *         name: offset
 *         required: false
 *         description: Number of items to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Data retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/YourSchema'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check (if required)
    const session = await auth();
    if (!session) {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    // Your business logic here
    const data = await prisma.yourModel.findMany({
      take: limit,
      skip: offset,
      where: {
        // Your conditions
      },
      select: {
        // Your fields
      },
    });

    const total = await prisma.yourModel.count({
      where: {
        // Same conditions as above
      },
    });

    return Response.json({
      message: "Data retrieved successfully",
      data,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("GET /api/your-endpoint error:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Create a new resource
 *     description: |
 *       Creates a new resource with the provided data.
 *       Validates input and returns the created resource.
 *     tags:
 *       - Your Category
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       description: Data for creating the new resource
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Name of the resource
 *                 example: "My Resource"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address (optional)
 *                 example: "user@example.com"
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Resource created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/YourSchema'
 *       400:
 *         description: Bad request - validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - resource already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check (if required)
    const session = await auth();
    if (!session) {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Check for existing resource (if applicable)
    const existing = await prisma.yourModel.findFirst({
      where: {
        // Your uniqueness conditions
      },
    });

    if (existing) {
      return Response.json(
        { message: "Resource already exists" },
        { status: 409 }
      );
    }

    // Create the resource
    const created = await prisma.yourModel.create({
      data: {
        ...validatedData,
        userId: session.user.id, // If user-specific
      },
    });

    return Response.json(
      {
        message: "Resource created successfully",
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          message: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("POST /api/your-endpoint error:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add PUT, PATCH, DELETE methods as needed following the same pattern
