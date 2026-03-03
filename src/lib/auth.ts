import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/registro",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          organizationId: user.organizationId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // authorize() sets name, but PrismaAdapter may return firstName/lastName instead
        const u = user as any;
        token.name = user.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null);
        token.email = user.email;
        token.role = u.role;
        token.organizationId = u.organizationId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.name = (token.name as string) ?? "";
        session.user.email = (token.email as string) ?? "";
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId ?? null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/clases") ||
        nextUrl.pathname.startsWith("/paquetes") ||
        nextUrl.pathname.startsWith("/equipo") ||
        nextUrl.pathname.startsWith("/espacios") ||
        nextUrl.pathname.startsWith("/usuarios") ||
        nextUrl.pathname.startsWith("/crm") ||
        nextUrl.pathname.startsWith("/pos") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/coach") ||
        nextUrl.pathname.startsWith("/app");

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }
      return true;
    },
  },
});
