# Supabase CLI Commands Reference

## Check Status

```bash
# Check if Supabase is running and see all service URLs
supabase status
```

This shows:
- API URL
- GraphQL URL
- S3 Storage URL
- DB URL
- Studio URL
- Inbucket URL (for email testing)
- JWT secret
- Service role key
- Anon key

## Starting & Stopping

```bash
# Start local Supabase (Docker containers)
supabase start

# Stop local Supabase (preserves data)
supabase stop

# Stop and remove all data (fresh start)
supabase stop --no-backup
```

## Database & Migrations

```bash
# Check migration status (local)
supabase migration list --local

# Apply pending migrations (SAFE - preserves data)
supabase migration up --local

# Create a new migration file
supabase migration new <migration_name>

# Generate migration from schema diff
supabase db diff -f <migration_name>
```

> 💡 **Note**: Use `--local` flag for local development. Without it, commands try to connect to a remote project (requires `supabase link` first).

> ⚠️ **WARNING**: Never use `supabase db reset` or `supabase db push --reset` - these destroy all data!

## Database Access

```bash
# Open psql shell to local database
supabase db psql

# Execute SQL directly
supabase db psql -c "SELECT * FROM your_table;"
```

## Logs & Debugging

```bash
# View logs from all services
supabase logs

# View logs from specific service
supabase logs --service auth
supabase logs --service postgres
supabase logs --service storage
```

## Type Generation

```bash
# Generate TypeScript types from your database schema
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Functions (Edge Functions)

```bash
# List all functions
supabase functions list

# Create a new function
supabase functions new <function_name>

# Serve functions locally (for development)
supabase functions serve

# Deploy a function
supabase functions deploy <function_name>
```

## Linking to Remote Project

```bash
# Link to your Supabase project
supabase link --project-ref <project-id>

# Push local migrations to remote
supabase db push

# Pull remote schema changes
supabase db pull
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `supabase status` | Check if running + show URLs/keys |
| `supabase start` | Start local instance |
| `supabase stop` | Stop local instance |
| `supabase migration list --local` | Show local migration status |
| `supabase migration up --local` | Apply pending migrations locally |
| `supabase db psql` | Open database shell |
| `supabase logs` | View service logs |

## Useful URLs (when running locally)

- **Studio Dashboard**: http://127.0.0.1:54323
- **API**: http://127.0.0.1:54321
- **Inbucket (Email)**: http://127.0.0.1:54324
