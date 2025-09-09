# 🚀 Supabase Migration Deployment Checklist

## ✅ Completed Steps

- [x] **Database Migration**: All data successfully migrated from Neon to Supabase
- [x] **Schema Applied**: Full database schema created in Supabase
- [x] **Data Verified**: All 91 records verified between databases
- [x] **App Connection**: Application now connects to Supabase database
- [x] **Dependencies**: Supabase SDK installed and configured

## 🔄 Manual Steps Required

### 1. **Create Storage Bucket** (5 minutes)
Go to [Supabase Dashboard](https://supabase.com/dashboard/project/cfakyqthkdplvagvarxk) → Storage:

1. Click "New bucket"
2. Name: `documents`
3. Set as **Private** (not public)
4. File size limit: **50MB**
5. Allowed file types: `pdf,jpg,jpeg,png,doc,docx`

### 2. **Set Row Level Security Policies** (10 minutes)
Go to Authentication → Policies, create these policies:

**For Storage (bucket: documents):**
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files  
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**For Database Tables:**
```sql
-- Users can only access their own data
CREATE POLICY "Users access own data" ON users
FOR ALL USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users access own properties" ON properties  
FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);
```

### 3. **Update Production Environment Variables**
In Vercel dashboard, update these environment variables:

```bash
# Replace the DATABASE_URL
DATABASE_URL=postgresql://postgres:Rh3aDxPctw8HJyIy@db.cfakyqthkdplvagvarxk.supabase.co:5432/postgres

# Add Supabase variables (already set)
NEXT_PUBLIC_SUPABASE_URL=https://cfakyqthkdplvagvarxk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. **Test File Upload** (5 minutes)
After deployment:
1. Go to your timeline page
2. Try uploading a PDF > 10MB 
3. Should work without Cloudinary errors

## 🗄️ File Storage Migration Strategy

**Current Approach**: Hybrid (No immediate file migration needed)
- **Existing files**: Stay in Cloudinary (URLs still work)  
- **New uploads**: Go to Supabase Storage
- **No data loss**: All existing documents remain accessible

## 🚨 Rollback Plan (If Issues Arise)

If problems occur, you can instantly rollback:

```bash
# In .env and Vercel, change DATABASE_URL back to:
DATABASE_URL=postgresql://neondb_owner:npg_HqGpfYzj8Ds5@ep-autumn-rain-adxtmygh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

The Neon database is still active with all data intact.

## 📊 Benefits After Migration

- ✅ **50MB file uploads** (vs 10MB Cloudinary limit)
- ✅ **One vendor** instead of three (Neon + Cloudinary → Supabase)
- ✅ **Better security** with Row Level Security
- ✅ **Cost savings** ($25/month vs $89/month)
- ✅ **Unified admin** dashboard

## 🎯 Next Steps

1. Complete the 4 manual steps above
2. Deploy to production  
3. Test file uploads
4. Monitor for 24-48 hours
5. If stable, can deactivate Neon database

**Estimated total time: 30 minutes**