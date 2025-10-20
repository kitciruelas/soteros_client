# reCAPTCHA Setup Instructions

## Issue
The incident report page is showing "Invalid domain for site key in reCAPTCHA" error because the reCAPTCHA site key is hardcoded and configured for a different domain.

## Solution
The reCAPTCHA site key is now configurable through environment variables.

## Setup Steps

### 1. Create a .env file in the frontend directory
Create a `.env` file in the `frontend/` directory with the following content:

```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_WS_PORT=5001

# reCAPTCHA Configuration
# Get your site key from: https://www.google.com/recaptcha/admin
# Make sure to add your domain to the reCAPTCHA site settings
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

### 2. Get a reCAPTCHA Site Key
1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site or use an existing one
3. Select reCAPTCHA v2 ("I'm not a robot" Checkbox)
4. Add your domain(s) to the domain list:
   - For local development: `localhost`, `127.0.0.1`
   - For production: your actual domain (e.g., `yourdomain.com`)
5. Copy the Site Key and paste it in your `.env` file

### 3. Restart the Development Server
After creating the `.env` file, restart your development server:

```bash
npm run dev
```

## Important Notes
- The `.env` file should be in the `frontend/` directory, not the root directory
- Make sure to add your domain to the reCAPTCHA site settings
- The site key is public and safe to use in frontend code
- Never commit your `.env` file to version control

## Testing
1. Open the incident report page
2. Try to submit a report as a guest user
3. The reCAPTCHA should now work without domain errors

## Troubleshooting
- If you still get domain errors, make sure your domain is added to the reCAPTCHA site settings
- Check that the `VITE_RECAPTCHA_SITE_KEY` environment variable is set correctly
- Restart the development server after making changes to the `.env` file
