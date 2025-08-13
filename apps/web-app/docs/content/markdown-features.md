# Markdown Features Guide

This guide covers all the Markdown and MDX features available in the Next.js 15 SaaS starter with Content Collections.

## Basic Markdown Syntax

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

### Text Formatting

```markdown
**Bold text**
*Italic text*
***Bold and italic***
~~Strikethrough~~
`Inline code`
```

### Links

```markdown
[Link text](https://example.com)
[Link with title](https://example.com "This is a title")
[Internal link](/docs/getting-started)
[Email link](mailto:contact@example.com)
```

### Lists

#### Unordered Lists
```markdown
- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3
```

#### Ordered Lists
```markdown
1. First item
2. Second item
   1. Nested item
   2. Another nested item
3. Third item
```

#### Task Lists (GitHub Flavored Markdown)
```markdown
- [x] Completed task
- [ ] Incomplete task
- [x] ~~Cancelled task~~
```

### Blockquotes

```markdown
> This is a blockquote.
> 
> It can span multiple lines.

> ### Blockquote with heading
> 
> You can include other Markdown elements in blockquotes.
```

### Horizontal Rules

```markdown
---
***
___
```

## Code Blocks

### Inline Code

```markdown
Use `const variable = "value"` for inline code.
```

### Code Blocks with Syntax Highlighting

````markdown
```javascript
function greetUser(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome, ${name}`;
}
```

```python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)
```

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```
````

### Supported Languages

The starter supports syntax highlighting for 100+ languages including:

- **Web**: JavaScript, TypeScript, HTML, CSS, SCSS, JSON
- **Backend**: Python, Java, C#, Go, Rust, PHP
- **Database**: SQL, PostgreSQL, MongoDB
- **Config**: YAML, TOML, INI, Dockerfile
- **Shell**: Bash, PowerShell, Zsh
- **And many more...**

### Code Block Features

- **Automatic syntax highlighting** with rehype-pretty-code
- **Copy button** for easy code copying
- **Line numbers** (optional)
- **Dark/light theme support**
- **Multiple theme options**

## Tables

### Basic Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

### Table Alignment

```markdown
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| Text         | Text           | Text          |
```

### Complex Tables

```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| Syntax Highlighting | ✅ Working | All languages supported |
| Tables | ✅ Working | GitHub Flavored Markdown |
| Task Lists | ✅ Working | Interactive checkboxes |
| Math | 🚧 Planned | KaTeX integration |
```

## Images

### Basic Images

```markdown
![Alt text](/_static/blog/image.jpg)
![Alt text with title](/_static/blog/image.jpg "Image title")
```

### Optimized Images with Next.js

```mdx
<Image
  src="/_static/blog/hero-image.jpg"
  width="800"
  height="400"
  alt="Hero image description"
/>
```

### Image Features

- **Automatic optimization** with Next.js Image component
- **Responsive images** with multiple sizes
- **Lazy loading** for better performance
- **Blur placeholder** while loading
- **WebP/AVIF support** for modern browsers

## GitHub Flavored Markdown (GFM)

### Autolinks

```markdown
https://github.com/vercel/next.js
www.example.com
contact@example.com
```

### Strikethrough

```markdown
~~This text is crossed out~~
```

### Task Lists

```markdown
- [x] Write documentation
- [x] Add syntax highlighting
- [ ] Add search functionality
- [ ] Implement comments
```

### Tables

Full table support with alignment and formatting.

## MDX Components

### Built-in Components

#### Callouts

```mdx
<Callout type="info">
  This is an informational callout.
</Callout>

<Callout type="warning">
  This is a warning callout.
</Callout>

<Callout type="error">
  This is an error callout.
</Callout>
```

#### Steps

```mdx
<Steps>

### Step 1: Install dependencies

Install the required packages.

### Step 2: Configure environment

Set up your environment variables.

### Step 3: Start development

Run the development server.

</Steps>
```

#### Cards

```mdx
<MdxCard href="/docs/installation" title="Installation">
  Get started by installing the project dependencies.
</MdxCard>
```

### Custom Components

You can use any React component in your MDX:

```mdx
<CustomButton variant="primary" size="large">
  Click me!
</CustomButton>

<VideoEmbed src="https://youtube.com/watch?v=..." />

<CodeSandbox id="example-sandbox" />
```

## Advanced Features

### Frontmatter Variables

Access frontmatter data in your content:

```mdx
---
title: "My Post"
author: "John Doe"
publishDate: "2024-01-15"
---

# {frontmatter.title}

Written by {frontmatter.author} on {frontmatter.publishDate}
```

### Dynamic Imports

```mdx
import { DynamicComponent } from "../components/DynamicComponent";

<DynamicComponent data={someData} />
```

### Conditional Content

```mdx
{process.env.NODE_ENV === 'development' && (
  <div>This only shows in development</div>
)}
```

## SEO and Metadata

### Automatic SEO

Content Collections automatically generates:

- **Meta titles** from frontmatter `title`
- **Meta descriptions** from frontmatter `description`
- **Open Graph tags** for social media
- **Structured data** for search engines
- **Canonical URLs** for proper indexing

### Custom Meta Tags

```yaml
---
title: "Complete Guide to Next.js 15"
description: "Everything you need to know about Next.js 15"
image: "/_static/blog/nextjs-15-guide.jpg"
keywords: ["nextjs", "react", "tutorial"]
---
```

## Performance Optimizations

### Automatic Optimizations

- **Code splitting** for better loading
- **Image optimization** with Next.js Image
- **Syntax highlighting** at build time
- **Static generation** for fast loading
- **Lazy loading** for images and components

### Best Practices

1. **Optimize images** before adding to content
2. **Use appropriate image formats** (WebP, AVIF)
3. **Keep content files reasonable size** (< 100KB)
4. **Use code blocks sparingly** in long articles
5. **Leverage static generation** for better performance

## Accessibility

### Built-in Accessibility

- **Semantic HTML** from Markdown
- **Proper heading hierarchy** (h1, h2, h3...)
- **Alt text** for images
- **Focus management** for interactive elements
- **Screen reader support** for all content

### Accessibility Best Practices

```markdown
# Use descriptive alt text
![Screenshot of the dashboard showing user analytics](/_static/screenshots/dashboard.jpg)

# Provide context for links
[Read our installation guide](/docs/installation) for detailed setup instructions.

# Use proper heading hierarchy
# Main Title (h1)
## Section Title (h2)
### Subsection Title (h3)
```

## Troubleshooting

### Common Issues

1. **Code blocks not highlighting**: Specify language
2. **Tables not rendering**: Enable GitHub Flavored Markdown
3. **Images not loading**: Check file paths
4. **Components not working**: Verify imports

### Debug Tips

```bash
# Check Content Collections processing
pnpm dev  # Look for processing logs

# Validate Markdown syntax
# Use online Markdown validators

# Test components separately
# Create isolated test files
```

## Examples

### Complete Blog Post

```mdx
---
title: "Advanced Next.js Patterns"
description: "Learn advanced patterns for building scalable Next.js applications"
date: "2024-01-15"
published: true
authors: ["john-doe"]
categories: ["education"]
image: "/_static/blog/advanced-nextjs.jpg"
---

# Advanced Next.js Patterns

This guide covers advanced patterns for building scalable Next.js applications.

## Table of Contents

- [Server Components](#server-components)
- [Client Components](#client-components)
- [Data Fetching](#data-fetching)

## Server Components

Server Components allow you to render components on the server...

```typescript
// Example server component
export default async function ServerComponent() {
  const data = await fetchData();
  return <div>{data.title}</div>;
}
```

<Callout type="info">
  Server Components run on the server and don't include JavaScript in the client bundle.
</Callout>

## Performance Comparison

| Pattern | Bundle Size | Performance | Use Case |
|---------|-------------|-------------|----------|
| Server Components | Smaller | Faster | Static content |
| Client Components | Larger | Interactive | Dynamic content |

## Next Steps

<Steps>

### Implement Server Components

Start by converting static components to Server Components.

### Add Client Interactivity

Use Client Components for interactive features.

### Optimize Performance

Measure and optimize your application performance.

</Steps>
```

This example demonstrates:
- ✅ **Complete frontmatter** with all metadata
- ✅ **Structured content** with headings and sections
- ✅ **Code examples** with syntax highlighting
- ✅ **Interactive components** (Callout, Steps)
- ✅ **Tables** for data comparison
- ✅ **SEO optimization** with proper metadata

---

The Markdown system in this starter provides everything you need to create rich, interactive content with excellent performance and SEO optimization.
