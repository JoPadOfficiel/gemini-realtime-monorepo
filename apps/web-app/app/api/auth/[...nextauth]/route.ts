/**
 * @swagger
 * /api/auth/{...nextauth}:
 *   get:
 *     summary: NextAuth.js authentication endpoints
 *     description: Handles authentication flows including sign-in, sign-out, and session management
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: path
 *         name: nextauth
 *         required: true
 *         description: NextAuth.js dynamic route segments (signin, signout, session, etc.)
 *         schema:
 *           type: string
 *           example: "signin"
 *     responses:
 *       200:
 *         description: Authentication response (varies by endpoint)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Session data
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     expires:
 *                       type: string
 *                       format: date-time
 *                 - type: object
 *                   description: Provider configuration
 *                   properties:
 *                     providers:
 *                       type: array
 *                       items:
 *                         type: object
 *       302:
 *         description: Redirect response for authentication flows
 *       401:
 *         description: Authentication failed
 *   post:
 *     summary: NextAuth.js authentication actions
 *     description: Handles POST requests for authentication actions like sign-in and sign-out
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: path
 *         name: nextauth
 *         required: true
 *         description: NextAuth.js dynamic route segments
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Authentication request data (varies by action)
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Authentication action completed
 *       302:
 *         description: Redirect after authentication action
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication failed
 */
export { GET, POST } from "@/auth"