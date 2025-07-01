# MediPause - Telemedicine Landing Page

A responsive landing page for MediPause telemedicine service with Tailwind CSS.

## Setting Up Tailwind CSS for Production

This project now uses a proper production setup for Tailwind CSS instead of the CDN version.

### Production Setup (Recommended Method)

1. Install Node.js from https://nodejs.org/

2. Open a command prompt in this project directory and run:
   ```
   npm install
   ```

3. Build the CSS for production:
   ```
   npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify
   ```

### Quick Start (Temporary Solution)

A basic CSS file has already been included in the dist folder so the page will work immediately, but for a proper production build, follow the steps above.

## Project Structure

- `index.html` - Main HTML file
- `src/input.css` - Source Tailwind CSS file
- `dist/output.css` - Generated production CSS file
- `assets/` - Directory containing images and other assets

## Production Ready

- The site uses a properly built Tailwind CSS file for production
- All JavaScript functionality is properly encapsulated
- The multi-step form is fully functional

## Features

- Responsive design for all screen sizes
- Multi-step form with validation
- Date range picker with restrictions
- Dynamic price calculation
- Interactive UI elements
- Stripe payment integration
- PDF certificate generation
- Email notifications

## Backend Setup

This project now includes a full backend implementation using Node.js, Express, Stripe, and more:

1. Set up your environment variables by creating a `.env` file with:
   ```
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   EMAIL_HOST=your_smtp_host
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   PORT=3000
   ```

2. Install the backend dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm run start
   ```
   
   For development with auto-reloading:
   ```
   npm run dev
   ```

4. Set up Stripe webhooks in your Stripe dashboard to point to `/stripe-webhook`

## Workflow

1. Users fill out the multi-step form on the landing page
2. Upon submission, the form data is sent to `/api/create-checkout-session`
3. User is redirected to Stripe for payment
4. After successful payment, Stripe sends a webhook to `/stripe-webhook`
5. The server generates a PDF certificate and sends it to the user via email
6. User is redirected to a success page

## Security & Compliance

- All user data is handled according to GDPR guidelines
- Payment processing is delegated to Stripe for maximum security
- Medical data is transmitted securely and processed by licensed professionals
- All medical certificates include verification information
