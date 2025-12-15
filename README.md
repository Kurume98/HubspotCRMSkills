# HubSpot CRM Skill - Lua AI Agent

A Lua AI Agent skill that allows your agent to create contacts in HubSpot CRM using a secure Private App token.

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start interactive sandbox chat
lua chat

# Push skill to server
lua push

# Deploy to production (only when ready)
lua push --deploy
```

## Project Structure

```
hubspot-skill/
├── src/
│   ├── index.ts                 # Agent configuration
│   └── skills/
│       ├── hubspotCRM.skill.ts  # Skill definition with tools
│       └── createContact.ts     # Contact creation logic
├── .env.example                 # Environment variable template
├── package.json                 # Project config
├── tsconfig.json                # TypeScript settings
└── README.md                    # This file
```

## Environment Variables

Create a `.env` file or configure via Lua CLI:

```bash
HUBSPOT_PRIVATE_APP_TOKEN=your-token-here
HUBSPOT_API_BASE_URL=https://api.hubapi.com
```

Set in production using:

```bash
lua env production
# Add: HUBSPOT_PRIVATE_APP_TOKEN
```

## Tool: createContact

Creates a new contact in HubSpot CRM.

**Input fields:**
- `email` - Contact's email address (recommended)
- `firstname` - First name
- `lastname` - Last name
- `phone` - Phone number (optional)
- `company` - Company name (optional)

**Example prompt:**
```
Create a contact with email test@example.com, firstname Test, lastname User.
```

## Testing

```bash
# Test only the tool
lua test

# Test entire agent (sandbox)
lua chat

# Test production after deployment
lua chat
# Select Production
```

## HubSpot Setup

Ensure your HubSpot private app has these scopes:
- `crm.objects.contacts.write`
- `crm.objects.contacts.read`

## Resources

- [Lua Docs](https://docs.heylua.ai)
- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
