import { defineCollection, defineConfig } from "@content-collections/core";
import { z } from "zod";

const posts = defineCollection({
  name: "posts",
  directory: "content/blog",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    date: z.string(),
    published: z.boolean().default(false),
    authors: z.array(z.string()).default(["shadcn"]),
    categories: z.array(z.enum(["news", "education"])).default(["news"]),
    related: z.array(z.string()).optional(),
  }),
  transform: (document) => {
    const images = document.content.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g) || [];
    return {
      ...document,
      slug: `/blog/${document._meta.path}`,
      slugAsParams: document._meta.path,
      images,
      body: {
        raw: document.content,
      },
    };
  },
});

const authors = defineCollection({
  name: "authors",
  directory: "content/authors",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    avatar: z.string().optional(),
    twitter: z.string().optional(),
  }),
  transform: (document) => {
    const images = document.content.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g) || [];
    return {
      ...document,
      slug: `/${document._meta.path}`,
      slugAsParams: document._meta.path,
      images,
      body: {
        raw: document.content,
      },
    };
  },
});

const pages = defineCollection({
  name: "pages",
  directory: "content/pages",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
  transform: (document) => {
    const images = document.content.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g) || [];
    return {
      ...document,
      slug: `/${document._meta.path}`,
      slugAsParams: document._meta.path,
      images,
      body: {
        raw: document.content,
      },
    };
  },
});

const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    published: z.boolean().default(true),
    featured: z.boolean().default(false),
    component: z.boolean().default(false),
    toc: z.boolean().default(true),
  }),
  transform: (document) => {
    const images = document.content.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g) || [];
    return {
      ...document,
      slug: `/${document._meta.path}`,
      slugAsParams: document._meta.path,
      images,
      body: {
        raw: document.content,
      },
    };
  },
});

const guides = defineCollection({
  name: "guides",
  directory: "content/guides",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.string(),
    published: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
  transform: (document) => {
    const images = document.content.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g) || [];
    return {
      ...document,
      slug: `/guides/${document._meta.path}`,
      slugAsParams: document._meta.path,
      images,
      body: {
        raw: document.content,
      },
    };
  },
});

export default defineConfig({
  collections: [posts, authors, pages, docs, guides],
});
