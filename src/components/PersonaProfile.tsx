"use client";

import React from "react";
import { useAuthStore } from "@/store/user.store";
import { format } from "date-fns";
import { User, Mail, Phone, Globe, MapPin, UserCheck, Calendar } from "lucide-react";

const PersonaProfile = ({ title }: { title: string }) => {
  const user = useAuthStore((state) => state.user) as any;

  if (!user) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  const profileData = [
    { label: "First Name", value: user.firstName, icon: <User size={18} /> },
    { label: "Last Name", value: user.lastName, icon: <User size={18} /> },
    { label: "Email Address", value: user.email, icon: <Mail size={18} /> },
    { label: "Phone Number", value: user.phoneNumber || "N/A", icon: <Phone size={18} /> },
    { label: "Role", value: user.role, icon: <UserCheck size={18} /> },
    { label: "Country", value: user.country || "N/A", icon: <Globe size={18} /> },
    { label: "City", value: user.currentCityOfResidence || "N/A", icon: <MapPin size={18} /> },
    { 
      label: "Joined Date", 
      value: user.createdAt ? format(new Date(user.createdAt), "PPP") : "N/A", 
      icon: <Calendar size={18} /> 
    },
  ];

  return (
    <section className="flex flex-col gap-8 mt-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32 relative">
           <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center text-blue-600 font-bold text-3xl">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
           </div>
        </div>
        
        <div className="pt-16 pb-8 px-8">
           <h2 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
           <p className="text-gray-500 capitalize">{user.role} • {title}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 border-t border-gray-50 bg-gray-50/50">
           {profileData.map((item, idx) => (
             <div key={idx} className="flex flex-col gap-1.5 p-4 bg-white rounded-lg border border-gray-100 shadow-sm transition-hover hover:border-blue-200">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                   {item.icon}
                   <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
                </div>
                <p className="font-semibold text-gray-800 truncate" title={String(item.value)}>
                   {item.value}
                </p>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
};

export default PersonaProfile;
