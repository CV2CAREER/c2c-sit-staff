"use client"
import React, { Suspense, useState } from "react";
import { User, Edit, Recycle, Trash2, Delete } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionType } from "@/types";
import { useBlogQueries } from "@/hooks/api/admin/blog";
import { IBlogPost } from "@/types/blog.types";
import { Chip } from "@heroui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyList from "@/components/EmptyList/EmptyList";
import ActionsMenu, { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { PostActionDialogs } from "./dialogs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_BLOG_EDIT_POST } from "@/constants/apiEndpoints/admin.endpoint";

type PostCardType = "active-posts" | "recycle-bin"
const filterLists = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "drafts", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" }
];

const BlogPostCards: React.FC<{type: PostCardType}> = ({type}) => {
  const [selectedFilter, setSelectedFilter] = React.useState<OptionType | { value: "all", label: "All" }>({ value: "all", label: "All" });

  const { blogPostsDomain } = useBlogQueries({ recycled: type === "recycle-bin" });
  const blogPosts = blogPostsDomain.data || [];

  return (
    <section>
      <section className="flex items-center justify-between">
        <h3 className="text-[16px] md:text-lg font-semibold">{type === "active-posts" ? "Active Posts" : "Recycle Bin"}</h3>
        <Select
          onValueChange={(value) => {
            const newItem = filterLists.find(i => i.value === value);
            setSelectedFilter(value === selectedFilter?.value ?  {value: "all", label: "All" } : newItem || {value: "all", label: "All" })
          }}
        >
          <SelectTrigger className="w-[180px] ml-auto bg-white shadow-md mb-5">
            <SelectValue
              placeholder={selectedFilter.label + ` (${blogPosts.length || 0})`}
            />
          </SelectTrigger>
          <SelectContent>
            {filterLists.map((item, idx) => (
              <SelectItem key={idx} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="flex flex-col gap-6">
        <Suspense fallback={<SkeletonCards numOfCards={5} />}>
        {blogPosts.length > 0 ? 
          blogPosts.map((post, idx) => <PostCard key={idx} post={post} type={type} />) 
          : (
            <EmptyList
             listName="Posts" 
             msgHeader={type === "active-posts" ? "No Blog Post yet" : "Recycle Bin is empty"}
              />
            )
          }
        </Suspense>
      </section>
    </section>
  );
};

export default BlogPostCards;

/*-- Internal Components --*/
const PostCard: React.FC<{post: IBlogPost; type: PostCardType}> = ({post, type}) => {
  const [activeDialog, setActiveDialog] = useState<DefaultActions | null>(null)
  const router = useRouter()

  const handleEditRedirect = () => {
    router.push(ADMIN_BLOG_EDIT_POST(post._id));
  };


  return (
    <React.Fragment>
      <div className="bg-white flex flex-col gap-3 rounded-md shadow-md p-4">
        <div className="flex justify-between items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="inline-block font-bold border rounded-sm py-1 px-3">{post.title.charAt(0)}</span>
            <Link href={ADMIN_BLOG_EDIT_POST(post._id)}>
              <h2 className="text-[15px] md:text-lg"  >{post.title}</h2>
            </Link>
          </div>
          <div className="text-[13px]">
            <Chip size="sm" color="success" className="text-white mr-3">{post.status}</Chip>
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-3 items-center justify-end mt-2">
          <Chip size="sm" color="primary" className="flex items-center gap-3">{post.category}</Chip>
          <div className="flex items-center gap-2 text-[13px]"><User /> {post.author}</div>
          <div>
            {type === "active-posts" ? (
              <ActionsMenu 
                actions={[
                  {label: "Edit Post", icon: Edit, action: "edit"},
                  {label: "Send to Bin", icon: Trash2, action: "soft-delete"}
                  ]}
                triggerActionDialog={setActiveDialog}
                triggerEditAction={handleEditRedirect}

              />
            ) : (
              <ActionsMenu 
                actions={[
                {label: "Restore Post", icon: Recycle, action: "restore"},
                {label: "Delete Post", icon: Delete,  action: "delete"}
                ]}
                triggerActionDialog={setActiveDialog}
              />
            )}
          </div>
        </div>
      </div>
      <PostActionDialogs
        activeDialog={activeDialog}
        setActiveDialog={setActiveDialog}
        postId={post._id}
      />

    </React.Fragment>
  )
}

const SkeletonCards: React.FC<{numOfCards: number}> = ({numOfCards}) => {
  return (
    <>
      {Array.from({ length: numOfCards }).map((_, idx) => (
        <div className="bg-white flex flex-col gap-3 rounded-md shadow-md p-4" key={idx}>
          <div className="flex justify-between gap-2">
            <Skeleton className="h-[125px] w-[50%] rounded-xl" />
            <Skeleton className="h-[125px] w-[20%] rounded-xl" />
          </div>
          <div className="flex justify-end gap-3 space-y-2">
            <Skeleton className="h-4 w-[30%]" />
            <Skeleton className="h-4 w-[30%]" />
          </div>
        </div>
      ))}
    </>
  )
}