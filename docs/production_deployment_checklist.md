# Production Deployment Checklist

This document outlines all the necessary steps and checks required before and during the deployment of the e-commerce application to a live production environment.

## 1. Environment Variables & Security
- [ ] **Stripe Keys:** Replace `sk_test_...` (Test mode keys) with real Stripe live keys in the `.env` file.
- [ ] **Frontend API URL:** Change `http://localhost:5000` to the live backend URL (e.g., `https://api.yourdomain.com`) by setting `VITE_API_URL` in the frontend `.env`.
- [ ] **JWT Secret:** Change `JWT_SECRET` to a strong, randomly generated string in the backend `.env`.
- [ ] **Node Environment:** Ensure `NODE_ENV=production` is set in both the frontend and backend to enable optimizations and disable detailed error stack traces.
- [ ] **Twilio Credentials:** Ensure the correct Twilio Account SID and Auth Token are used, and that Geo Permissions are enabled for the target countries.

## 2. Hosting & Deployment Setup
- [ ] **Frontend Hosting:** Deploy the React/Vite frontend to a static hosting provider like **Vercel**, **Netlify**, or AWS S3/CloudFront. Run `npm run build` to generate the optimized static files.
- [ ] **Backend Hosting:** Deploy the Node.js backend on a VPS (DigitalOcean, AWS EC2, Hostinger, Render, etc.).
- [ ] **Process Management:** Use **PM2** (`pm2 start src/index.ts --name "ecom-backend"`) or Docker to keep the Node.js server running in the background persistently.
- [ ] **Production Database:** Migrate from local PostgreSQL to a managed production database (e.g., AWS RDS, Supabase, Neon) and update the `DATABASE_URL`.
- [ ] **Redis Server:** Set up a production Redis instance (e.g., Upstash, AWS ElastiCache) and update `REDIS_URL`. Ensure `ENABLE_REDIS="true"`.

## 3. Domain, Proxy & SSL (HTTPS)
- [ ] **Domain Setup:** Purchase a custom domain and configure DNS records (A/CNAME) to point to the frontend and backend servers.
- [ ] **Reverse Proxy (Nginx):** Set up Nginx on the backend server to proxy requests from port 80/443 to the internal Node.js port (e.g., 5000).
- [ ] **SSL Certificates:** Install SSL certificates (via Let's Encrypt / Certbot) for both frontend and backend domains to ensure HTTPS. **Required for Stripe, Twilio, and secure authentication.**

## 4. Third-Party Webhooks & Integrations
- [ ] **Stripe Webhooks:** Update the Stripe Dashboard with the live webhook endpoint (e.g., `https://api.yourdomain.com/api/v1/orders/webhook/stripe`) to receive payment updates.
- [ ] **Sendcloud Webhooks:** Update the live webhook URL in the Sendcloud panel for real-time shipment tracking updates.
- [ ] **SMTP Configuration:** Ensure live SMTP credentials (e.g., Amazon SES, SendGrid, or custom webmail) are set in Admin Panel / `.env` for order confirmation and notification emails.

## 5. Final Verification & Data
- [ ] **Run Migrations:** Run `npx prisma migrate deploy` on the production database.
- [ ] **Clear Test Data:** Clear out any mock orders, test customers, and dummy data used during development from the database.
- [ ] **CORS Configuration:** Ensure the backend CORS configuration strictly allows only the live frontend domain.

## 6. Frontend Content & Legal Pages (Crucial for Payment Gateways)
- [ ] **Legal Pages Created:** Ensure "Privacy Policy", "Terms & Conditions", "Refund & Return Policy", and "Shipping Policy" are created in the CMS and linked in the footer.
- [ ] **Branding Check:** Ensure the Favicon (browser tab icon) and main logo are replaced with the actual brand logo in the frontend `public` folder and CMS.
- [ ] **SEO & Analytics:** Ensure Google Analytics, Facebook Pixel, and other meta tracking tags are injected in `index.html` if required.
- [ ] **Social Media Links:** Update footer social links from `#` to actual URLs.

---
*Once all checkboxes are ticked, the platform is fully ready for live customers!*
