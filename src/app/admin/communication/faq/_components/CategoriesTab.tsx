"use client";

import type { FaqCategory } from "@/types/faq.types";

export function CategoriesTab({ categories }: { categories: FaqCategory[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                <td className="px-4 py-3 text-gray-600">{category.articleCount}</td>
                <td className="px-4 py-3 text-gray-600">{category.publishedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Categories are a fixed list, not free text — so &quot;Payments&quot;, &quot;payments&quot; and
        &quot;Billing&quot; can never become three categories that are really one.
      </p>
    </div>
  );
}
