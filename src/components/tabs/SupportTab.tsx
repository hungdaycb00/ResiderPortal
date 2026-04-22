import React from 'react';
import { HelpCircle, Mail, MessageCircle } from 'lucide-react';

const SupportTab: React.FC = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-400" />
                Help & Support
            </h2>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1a1d24] border border-gray-800 p-6 rounded-2xl text-center hover:border-blue-500/50 transition-colors cursor-pointer">
                        <Mail className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                        <h3 className="font-bold">Email Us</h3>
                        <p className="text-xs text-gray-500 mt-1">support@resider.com</p>
                    </div>
                    <div className="bg-[#1a1d24] border border-gray-800 p-6 rounded-2xl text-center hover:border-purple-500/50 transition-colors cursor-pointer">
                        <MessageCircle className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                        <h3 className="font-bold">Live Chat</h3>
                        <p className="text-xs text-gray-500 mt-1">Available 24/7</p>
                    </div>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 rounded-2xl p-8">
                    <h3 className="text-lg font-bold mb-6">Send us a message</h3>
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Name</label>
                                <input type="text" className="w-full bg-[#252830] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email</label>
                                <input type="email" className="w-full bg-[#252830] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your email" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Message</label>
                            <textarea className="w-full bg-[#252830] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]" placeholder="How can we help?"></textarea>
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SupportTab;
