# TheBell Deployment Guide

This guide covers deploying TheBell to various platforms with production-ready configurations.

## Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database schema deployed (run all SQL scripts)
- [ ] Environment variables documented
- [ ] Application tested locally
- [ ] User roles and permissions verified

## Vercel Deployment (Recommended)

### Step 1: Prepare Repository

1. Ensure your code is pushed to GitHub/GitLab/Bitbucket
2. Verify all environment variables are documented
3. Test the build locally: `pnpm build`

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your repository
4. Select "Next.js" as the framework preset

### Step 3: Configure Environment Variables

Add these environment variables in Vercel dashboard:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
\`\`\`

### Step 4: Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Test the deployed application
4. Configure custom domain (optional)

### Step 5: Post-Deployment Setup

1. **Update Supabase Auth Settings**:
   - Add your production URL to allowed redirect URLs
   - Update site URL in Supabase Auth settings

2. **Test User Registration**:
   - Create test accounts for each role
   - Verify email confirmations work
   - Test role-based access

3. **Configure Real-time**:
   - Verify real-time subscriptions work in production
   - Test task updates across multiple users

## Alternative Deployment Options

### Railway

1. Connect your GitHub repository
2. Add environment variables
3. Deploy with automatic builds

### DigitalOcean App Platform

1. Create new app from GitHub
2. Configure build and run commands
3. Set environment variables
4. Deploy

### Self-Hosted (Docker)

\`\`\`dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
\`\`\`

## Database Setup

### Production Database Configuration

1. **Enable Row Level Security**: Ensure all tables have RLS enabled
2. **Run Migration Scripts**: Execute all scripts in order
3. **Create Admin User**: Set up initial admin account
4. **Test Permissions**: Verify role-based access works

### Backup Strategy

1. **Automated Backups**: Enable in Supabase dashboard
2. **Point-in-Time Recovery**: Configure retention period
3. **Export Scripts**: Regular exports of critical data

## Monitoring and Maintenance

### Health Checks

- Monitor application uptime
- Check database connection
- Verify real-time functionality
- Test authentication flow

### Performance Monitoring

- Use Vercel Analytics for performance insights
- Monitor database query performance
- Track user activity and system usage

### Security Monitoring

- Regular security updates
- Monitor authentication logs
- Review user access patterns
- Audit role permissions

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all required variables are set
2. **Database Connection**: Verify Supabase configuration
3. **Authentication**: Check redirect URLs and email settings
4. **Real-time**: Confirm WebSocket connections work
5. **Permissions**: Verify RLS policies are correct

### Debug Mode

Enable debug logging in production:

\`\`\`env
NEXT_PUBLIC_DEBUG=true
\`\`\`

### Support Checklist

When reporting issues, include:

- [ ] Deployment platform
- [ ] Error messages and logs
- [ ] Steps to reproduce
- [ ] Environment configuration
- [ ] Database schema version

## Scaling Considerations

### Performance Optimization

- Enable Next.js image optimization
- Configure CDN for static assets
- Optimize database queries
- Implement caching strategies

### High Availability

- Use multiple deployment regions
- Configure database replicas
- Implement health checks
- Set up monitoring alerts

---

For additional support, refer to the main README.md or contact the development team.
