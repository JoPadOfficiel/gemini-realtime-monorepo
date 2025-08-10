import { Metadata } from "next";
import { notFound } from "next/navigation";
import { allPosts } from "content-collections";

import { BLOG_CATEGORIES } from "@/config/blog";
import { constructMetadata, getBlurDataURL } from "@/lib/utils";
import { BlogCard } from "@/components/content/blog-card";

export async function generateStaticParams() {
  return BLOG_CATEGORIES.map((category) => ({
    slug: category.slug,
  }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata | undefined> {
  const params = await props.params;
  const category = BLOG_CATEGORIES.find(
    (category) => category.slug === params.slug,
  );
  if (!category) {
    return;
  }

  const { title, description } = category;

  return constructMetadata({
    title: `${title} Posts – Next SaaS Starter`,
    description,
  });
}

export default async function BlogCategory(
  props: {
    params: Promise<{
      slug: string;
    }>;
  }
) {
  const params = await props.params;
  const category = BLOG_CATEGORIES.find((ctg) => ctg.slug === params.slug);

  if (!category) {
    notFound();
  }

  const articles = await Promise.all(
    allPosts
      .filter((post) => post.categories.includes(category.slug))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(async (post) => ({
        ...post,
        blurDataURL: await getBlurDataURL(post.image || null),
      })),
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, idx) => (
        <BlogCard key={article.slugAsParams} data={article} priority={idx <= 2} />
      ))}
    </div>
  );
}
