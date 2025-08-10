# Content Collections Troubleshooting

This guide helps you resolve common issues with Content Collections and content management.

## Common Issues

### Content Not Appearing

#### Symptoms
- Blog posts or docs not showing up on the website
- Empty collections or missing content
- Build succeeds but content is missing

#### Solutions

1. **Check `published` status**
   ```yaml
   ---
   title: "My Post"
   published: true  # Make sure this is true
   ---
   ```

2. **Verify file location**
   ```bash
   # Correct structure
   content/
   ├── blog/
   │   └── my-post.mdx     # ✅ Correct
   ├── docs/
   │   └── guide.mdx       # ✅ Correct
   └── guides/
       └── tutorial.mdx    # ✅ Correct
   
   # Incorrect locations
   content/
   ├── posts/              # ❌ Wrong - should be 'blog'
   ├── documentation/      # ❌ Wrong - should be 'docs'
   ```

3. **Check frontmatter syntax**
   ```yaml
   # ✅ Correct YAML
   ---
   title: "My Post"
   date: "2024-01-15"
   published: true
   ---
   
   # ❌ Invalid YAML
   ---
   title: My Post Without Quotes
   date: 2024-01-15  # Should be string
   published: yes    # Should be boolean
   ---
   ```

4. **Restart development server**
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm dev
   ```

### Build Errors

#### Schema Validation Errors

**Error**: `Expected string, received number`
```bash
# Error in frontmatter
---
title: 123  # Should be string
---

# Fix
---
title: "My Title"
---
```

**Error**: `Required field missing`
```bash
# Missing required field
---
description: "Some description"
# Missing title field
---

# Fix
---
title: "My Title"        # Required
description: "Some description"
---
```

#### Invalid Enum Values

**Error**: `Invalid enum value. Expected 'news' | 'education'`
```bash
# Invalid category
---
categories:
  - tutorial  # Not in allowed enum values
---

# Fix - use allowed values
---
categories:
  - education  # ✅ Valid
---

# Or update schema in content-collections.ts
categories: z.array(z.enum(["news", "education", "tutorial"]))
```

### Markdown Rendering Issues

#### Code Blocks Not Highlighting

**Issue**: Code blocks appear without syntax highlighting

**Solutions**:
1. **Specify language**
   ```markdown
   # ❌ No language specified
   ```
   const hello = "world";
   ```
   
   # ✅ Language specified
   ```javascript
   const hello = "world";
   ```
   ```

2. **Check rehype-pretty-code configuration**
   ```typescript
   // In components/content/mdx-components.tsx
   options={{
     mdxOptions: {
       rehypePlugins: [
         [rehypePrettyCode, {
           theme: {
             dark: "github-dark",
             light: "github-light",
           },
         }],
       ],
     },
   }}
   ```

#### Tables Not Rendering

**Issue**: Markdown tables appear as plain text

**Solutions**:
1. **Enable GitHub Flavored Markdown**
   ```typescript
   // In components/content/mdx-components.tsx
   import remarkGfm from "remark-gfm";
   
   options={{
     mdxOptions: {
       remarkPlugins: [remarkGfm],  // Enable GFM
     },
   }}
   ```

2. **Check table syntax**
   ```markdown
   # ✅ Correct table syntax
   | Column 1 | Column 2 |
   |----------|----------|
   | Data 1   | Data 2   |
   
   # ❌ Missing header separator
   | Column 1 | Column 2 |
   | Data 1   | Data 2   |
   ```

#### Images Not Loading

**Issue**: Images in MDX content not displaying

**Solutions**:
1. **Use correct image paths**
   ```markdown
   # ✅ Correct - absolute path from public/
   ![Alt text](/_static/blog/image.jpg)
   
   # ❌ Incorrect - relative path
   ![Alt text](./images/image.jpg)
   ```

2. **Use Image component for optimization**
   ```mdx
   <Image
     src="/_static/blog/image.jpg"
     width="600"
     height="400"
     alt="Description"
   />
   ```

### Performance Issues

#### Slow Build Times

**Issue**: Content Collections processing takes too long

**Solutions**:
1. **Optimize content structure**
   ```bash
   # Avoid deeply nested directories
   content/blog/2024/01/15/post.mdx  # ❌ Too deep
   content/blog/post-2024-01-15.mdx  # ✅ Better
   ```

2. **Reduce content size**
   - Split large files into smaller ones
   - Optimize images before adding to content
   - Remove unused frontmatter fields

3. **Check for infinite loops**
   ```yaml
   # ❌ Circular references in related posts
   # post-a.mdx
   related: [post-b]
   
   # post-b.mdx  
   related: [post-a]  # Creates circular reference
   ```

#### Memory Issues

**Issue**: Build fails with out-of-memory errors

**Solutions**:
1. **Increase Node.js memory limit**
   ```bash
   # In package.json
   "scripts": {
     "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
   }
   ```

2. **Optimize content processing**
   ```typescript
   // In content-collections.ts - avoid heavy processing
   transform: (document) => {
     // ❌ Heavy processing
     const processedContent = heavyMarkdownProcessor(document.content);
     
     // ✅ Light processing
     return {
       ...document,
       slug: `/${document._meta.path}`,
       body: { raw: document.content },
     };
   }
   ```

### Development Issues

#### Hot Reloading Not Working

**Issue**: Changes to content files don't trigger updates

**Solutions**:
1. **Restart development server**
   ```bash
   # Stop (Ctrl+C) and restart
   pnpm dev
   ```

2. **Check file watching**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   pnpm dev
   ```

3. **Verify file extensions**
   ```bash
   # ✅ Correct extensions
   content/blog/post.mdx
   content/docs/guide.mdx
   
   # ❌ Wrong extensions
   content/blog/post.md   # Should be .mdx
   content/docs/guide.txt # Should be .mdx
   ```

#### TypeScript Errors

**Issue**: TypeScript can't find content types

**Solutions**:
1. **Restart TypeScript server**
   - In VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

2. **Check imports**
   ```typescript
   // ✅ Correct import
   import { allPosts } from "content-collections";
   import type { Post } from "content-collections";
   
   // ❌ Incorrect import
   import { allPosts } from ".content-collections/generated";
   ```

3. **Verify tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "content-collections": ["./.content-collections/generated"]
       }
     }
   }
   ```

## Debugging Tips

### Enable Verbose Logging

```bash
# Add debug flag to see detailed processing
DEBUG=content-collections* pnpm dev
```

### Check Generated Files

```bash
# Inspect generated types and data
ls -la .content-collections/generated/
cat .content-collections/generated/index.d.ts
```

### Validate Content Manually

```typescript
// Create a validation script
import { z } from "zod";

const postSchema = z.object({
  title: z.string(),
  date: z.string(),
  published: z.boolean(),
});

// Test your frontmatter
const testPost = {
  title: "Test",
  date: "2024-01-15",
  published: true,
};

console.log(postSchema.parse(testPost)); // Should not throw
```

## Getting Help

### Before Asking for Help

1. **Check the console** for error messages
2. **Verify file structure** matches expected patterns
3. **Test with minimal content** to isolate issues
4. **Check recent changes** that might have caused the issue

### Where to Get Help

1. **Documentation**: [Content Collections Docs](https://www.content-collections.dev/)
2. **GitHub Issues**: [Project Issues](https://github.com/mickasmt/next-saas-stripe-starter/issues)
3. **Community**: [GitHub Discussions](https://github.com/mickasmt/next-saas-stripe-starter/discussions)

### Reporting Issues

When reporting issues, include:
- **Error messages** (full stack trace)
- **File structure** of your content
- **Frontmatter examples** that cause issues
- **Steps to reproduce** the problem
- **Environment details** (Node.js version, OS, etc.)

---

Most content issues can be resolved by checking frontmatter syntax, file locations, and restarting the development server. For complex issues, the debugging tips above should help identify the root cause.
