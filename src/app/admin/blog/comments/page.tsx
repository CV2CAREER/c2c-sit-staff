import EmptyList from "@/components/EmptyList/EmptyList";

const BlogCommentsPage = () => (
  <section>
    <EmptyList 
     listName="Comments" 
     msgHeader="No new comments" 
     descr="Check again later for new comments."
    />
  </section>
);

export default BlogCommentsPage;
