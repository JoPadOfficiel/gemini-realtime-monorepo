# Content Collections Overview

Content Collections is a modern, type-safe content management system that replaces Contentlayer in this Next.js 15 SaaS starter. It provides a powerful way to manage all your content including blog posts, documentation, guides, and static pages.

## What is Content Collections?

Content Collections is a content management system that:
- **Processes Markdown/MDX files** into type-safe TypeScript objects
- **Provides automatic type generation** for your content schemas
- **Supports complex content relationships** between different content types
- **Offers excellent developer experience** with hot reloading and error handling
- **Integrates seamlessly** with Next.js App Router and Server Components

## Why Content Collections?

### Advantages over Contentlayer

| Feature | Content Collections | Contentlayer |
|---------|-------------------|--------------|
| **Next.js 15 Support** | ✅ Full support | ❌ Limited/deprecated |
| **Type Safety** | ✅ Excellent | ✅ Good |
| **Performance** | ✅ Faster builds | ⚠️ Slower |
| **Maintenance** | ✅ Actively maintained | ❌ Deprecated |
| **Developer Experience** | ✅ Superior | ✅ Good |
| **Error Handling** | ✅ Better error messages | ⚠️ Basic |

### Key Benefits

1. **Type Safety**: Automatic TypeScript types for all your content
2. **Performance**: Fast builds and hot reloading
3. **Flexibility**: Support for complex content schemas and relationships
4. **Developer Experience**: Excellent error messages and debugging
5. **Future-Proof**: Actively maintained and updated

## Content Types

The starter includes five main content types:

### 1. Blog Posts (`content/blog/`)
- **Purpose**: Articles, news, updates, tutorials
- **URL Pattern**: `/blog/[slug]`
- **Features**: Authors, categories, related posts, featured images

### 2. Documentation (`content/docs/`)
- **Purpose**: Technical documentation, guides, API references
- **URL Pattern**: `/docs/[...slug]`
- **Features**: Nested navigation, table of contents, search

### 3. Guides (`content/guides/`)
- **Purpose**: Step-by-step tutorials, how-to guides
- **URL Pattern**: `/guides/[slug]`
- **Features**: Featured guides, difficulty levels, completion tracking

### 4. Authors (`content/authors/`)
- **Purpose**: Author profiles and biographies
- **URL Pattern**: Used in blog posts and guides
- **Features**: Social links, bio, avatar, contact information

### 5. Pages (`content/pages/`)
- **Purpose**: Static pages like privacy policy, terms of service
- **URL Pattern**: `/[slug]`
- **Features**: Simple content pages with SEO optimization

## File Structure

```
content/
├── blog/                 # Blog posts
│   ├── my-first-post.mdx
│   ├── advanced-tutorial.mdx
│   └── company-news.mdx
├── docs/                 # Documentation
│   ├── index.mdx
│   ├── getting-started/
│   │   ├── installation.mdx
│   │   └── quick-start.mdx
│   └── configuration/
│       ├── database.mdx
│       └── authentication.mdx
├── guides/               # Tutorial guides
│   ├── deploy-to-vercel.mdx
│   ├── setup-stripe.mdx
│   └── custom-components.mdx
├── authors/              # Author profiles
│   ├── john-doe.mdx
│   └── jane-smith.mdx
└── pages/                # Static pages
    ├── privacy.mdx
    ├── terms.mdx
    └── about.mdx
```

## Configuration

Content Collections is configured in `content-collections.ts`:

```typescript
import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";

// Define blog posts collection
const posts = defineCollection({
  name: "posts",
  directory: "content/blog",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.string(),
    published: z.boolean().default(false),
    authors: z.array(z.string()).default(["shadcn"]),
    categories: z.array(z.enum(["news", "education"])).default(["news"]),
    image: z.string().optional(),
    related: z.array(z.string()).optional(),
  }),
  transform: (document) => ({
    ...document,
    slug: `/blog/${document._meta.path}`,
    slugAsParams: document._meta.path,
    body: { raw: document.content },
  }),
});

export default defineConfig({
  collections: [posts, docs, guides, authors, pages],
});
```

## Content Processing Pipeline

1. **File Detection**: Content Collections scans the `content/` directory
2. **Schema Validation**: Each file is validated against its collection schema
3. **Frontmatter Parsing**: YAML frontmatter is parsed and typed
4. **Content Processing**: Markdown/MDX content is processed
5. **Type Generation**: TypeScript types are automatically generated
6. **Build Integration**: Processed content is available in your app

## Frontmatter Schemas

### Blog Posts
```yaml
---
title: "Your Post Title"                    # Required
description: "Brief description"            # Optional
date: "2024-01-15"                         # Required
published: true                            # Default: false
image: "/_static/blog/image.jpg"           # Optional
authors:                                   # Default: ["shadcn"]
  - john-doe
  - jane-smith
categories:                                # Default: ["news"]
  - education
  - news
related:                                   # Optional
  - related-post-slug
  - another-post-slug
---
```

### Documentation
```yaml
---
title: "Page Title"                        # Required
description: "Page description"            # Optional
published: true                            # Default: true
featured: false                            # Default: false
component: false                           # Default: false
toc: true                                  # Default: true
---
```

### Guides
```yaml
---
title: "Guide Title"                       # Required
description: "Guide description"           # Optional
date: "2024-01-15"                        # Required
published: true                            # Default: false
featured: false                            # Default: false
---
```

## Using Content in Your App

### Importing Collections

```typescript
import { allPosts, allDocs, allGuides } from "content-collections";

// Get all published blog posts
const publishedPosts = allPosts.filter(post => post.published);

// Get a specific post by slug
const post = allPosts.find(post => post.slugAsParams === "my-post-slug");

// Get featured guides
const featuredGuides = allGuides.filter(guide => guide.featured);
```

### Type Safety

Content Collections automatically generates TypeScript types:

```typescript
import type { Post, Doc, Guide } from "content-collections";

// All content has proper typing
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.description}</p>
      <time>{post.date}</time>
      {/* TypeScript knows all available properties */}
    </article>
  );
}
```

### Server Components

Use content in Server Components for optimal performance:

```typescript
import { allPosts } from "content-collections";
import { Mdx } from "@/components/content/mdx-components";

export default function BlogPage({ params }: { params: { slug: string } }) {
  const post = allPosts.find(post => post.slugAsParams === params.slug);
  
  if (!post) {
    notFound();
  }

  return (
    <article>
      <header>
        <h1>{post.title}</h1>
        <p>{post.description}</p>
      </header>
      <Mdx content={post.body.raw} />
    </article>
  );
}
```

## Development Workflow

### 1. Create Content
```bash
# Create a new blog post
touch content/blog/my-new-post.mdx
```

### 2. Add Frontmatter
```yaml
---
title: "My New Post"
description: "This is my new blog post"
date: "2024-01-15"
published: true
authors:
  - your-name
categories:
  - education
---

# My New Post

Content goes here...
```

### 3. Hot Reloading
Content Collections automatically:
- Detects new files
- Validates schemas
- Regenerates types
- Updates your app

### 4. Build Process
```bash
# Development
pnpm dev  # Content Collections runs automatically

# Production
pnpm build  # Content is processed during build
```

## Advanced Features

### Content Relationships
```typescript
// Get related posts
const relatedPosts = post.related?.map(slug => 
  allPosts.find(p => p.slugAsParams === slug)
).filter(Boolean) || [];
```

### Dynamic Routing
```typescript
// Generate static params for all posts
export function generateStaticParams() {
  return allPosts.map(post => ({
    slug: post.slugAsParams,
  }));
}
```

### Search and Filtering
```typescript
// Search posts by title or content
function searchPosts(query: string) {
  return allPosts.filter(post => 
    post.title.toLowerCase().includes(query.toLowerCase()) ||
    post.body.raw.toLowerCase().includes(query.toLowerCase())
  );
}
```

## Next Steps

- **[Creating Blog Posts](./blog-posts.md)** - Learn to write and manage blog content
- **[Documentation Pages](./documentation.md)** - Build comprehensive documentation
- **[Markdown Features](./markdown-features.md)** - Master MDX capabilities
- **[Content Organization](./organization.md)** - Best practices for content structure

---

Content Collections provides a powerful, type-safe foundation for all your content needs. Ready to start creating? Let's [write your first blog post](./blog-posts.md)! ✍️
