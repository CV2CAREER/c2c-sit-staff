"use client";

import Hero from "@/components/landing/Hero";
import Footer from "./Footer";
import Header from "./Header";

const Home = () => {
  return (
    <main className="  min-h-screen w-full overflow-x-hidden">
      <Header />

      <h1>STAFF PORTAL</h1>
      {/* REMAINING SECTIONS */}
      <Hero />

      <Footer />
    </main>
  );
};

export default Home;
