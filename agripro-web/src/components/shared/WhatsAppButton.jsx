import React from 'react';
import { IconBrandWhatsapp } from '@tabler/icons-react';

const WhatsAppButton = () => {
  const phoneNumber = "923065480825";
  const message = encodeURIComponent("Hello AgriPro! I'm interested in learning more about your platform.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 bg-[#25D366] text-white px-5 py-3 rounded-full shadow-2xl hover:bg-[#128C7E] hover:scale-110 transition-all active:scale-95 group animate-in fade-in slide-in-from-bottom-8 duration-700 delay-1000"
      title="Contact us on WhatsApp"
    >
      <div className="flex flex-col items-end leading-none">
        <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Support</span>
        <span className="text-sm font-bold">Chat with us</span>
      </div>
      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
        <IconBrandWhatsapp size={28} />
      </div>
      
      {/* Pulse effect */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] -z-10 animate-ping opacity-20"></span>
    </a>
  );
};

export default WhatsAppButton;
