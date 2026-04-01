"use client"
import { useEffect, useState } from "react";
import { RxHamburgerMenu } from "react-icons/rx";
import {
  Drawer,
  DrawerContent,
  DrawerBody,
} from "@heroui/drawer";
import {
  LucideIcon,
  Newspaper,
  View,
  MessageSquareText,
  ChartNoAxesCombined,
  Recycle,
   PenLine
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/*----  Types, Interfaces & Data  ----*/
type BlogMenuLinksProps = {
  name: string;
  href: string | null;
  icon: LucideIcon;
};
const navLinks : BlogMenuLinksProps[] = [
  { name: 'New Post', href: "/admin/blog/create-post", icon:  PenLine },
  { name: 'Posts', href: "/admin/blog", icon: Newspaper },
  { name: 'Stats', href: "/admin/blog/stats", icon: ChartNoAxesCombined },
  { name: 'Comments', href: "/admin/blog/comments", icon: MessageSquareText },
  { name: 'View Blog', href: "https://sit.cvtocareer.com/blogging", icon: View }, //TODO: handle dynamic blog route
  { name: 'Recycle Bin', href: "/admin/blog/recycle-bin", icon: Recycle },
]

const BlogMenuBar = () => {
  const currBlogPath = usePathname();
  const [activeLink, setActiveLink] = useState(currBlogPath);
  const [open, setOpen] = useState(false);
  const handleDrawerOpen = () => setOpen(true);

  useEffect(() => { 
    setActiveLink(currBlogPath) 
  }, [currBlogPath]);

  return (
    <section>
      <RxHamburgerMenu
        className="bg-lightblue cursor-pointer p-1 rounded-md"
        onClick={handleDrawerOpen}
        size={27}
        color="#008ED3"
      />

      {/* Drawer: Menu Links */}
      <Drawer className="bg-white" isOpen={open} onOpenChange={setOpen}>
        <DrawerContent className="py-4">
          {(onClose) => (
            <DrawerBody className="px-8 mt-9">
            <>
              {navLinks.map((link: BlogMenuLinksProps) => {
                const LIcon = link.icon;
                const currLink = activeLink === link.href
                
                  return (
                    <Link
                      onClick={() => {setActiveLink(link.href!); onClose();}}
                      className={`flex flex-row gap-4 items-center my-1 rounded-md p-2 text-[15px] ${currLink ? "text-blue font-bold bg-lightblue" : "text-gray-600"}`}
                      key={link.name}
                      href={link.href!}
                    >
                      <LIcon
                        className="cursor-pointer"
                      />
                      <p>{link.name}</p>
                    </Link>
                  );
              })}
            </>
            </DrawerBody>
          )}
        </DrawerContent>
      </Drawer>
    </section>
  );
};

export default BlogMenuBar;
