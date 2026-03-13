import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "../components/ui/button";

export default function BookingPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { type, id } = useParams();

  const product = state?.product || {};

  // Provide fallback info depending on product type
  const productName = product.name || product.restaurantName || product.description || product.details || "Booking Item";
  const cost = product.cost || product.price_per_night || product.avg_meal_cost || product.estimated_cost || 0;
  const currency = product.currency || "USD";

  return (
    <div className="min-h-[80vh] flex flex-col font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] rounded-[14px] p-4 md:p-8">
      <div className="max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2 text-[#6D4C41] hover:bg-white hover:text-[#6D4C41]"
        >
          <ArrowLeft size={18} /> Back to Trip Details
        </Button>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="bg-[#2E7D32] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl mix-blend-overlay pointer-events-none" />
            <h1 className="text-3xl font-bold font-['Playfair_Display'] relative z-10 mb-2">
              Complete Your Booking
            </h1>
            <p className="opacity-90 relative z-10">Securely reserve your spot in just a few clicks.</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4 border-b border-[#E5E7EB] pb-2 text-[#2C2C2C]">
                  Booking Details
                </h2>
                <div className="space-y-4">
                  <div className="bg-[#F5F5F0] p-4 rounded-xl border border-[#E5E7EB]">
                    <p className="text-sm uppercase tracking-wider font-bold text-[#6D4C41] mb-1">
                      {type === "activity" ? "Activity" : type === "accommodation" ? "Accommodation" : type === "dining" ? "Dining" : "Transport"}
                    </p>
                    <p className="text-lg font-bold font-['Playfair_Display']">{productName}</p>
                    {product.neighborhood && <p className="text-sm text-[#6D4C41] mt-1">{product.neighborhood}</p>}
                    {product.dates && <p className="text-sm text-[#6D4C41] mt-1">Dates: {product.dates}</p>}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4 border-b border-[#E5E7EB] pb-2 text-[#2C2C2C]">
                  Guest Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#6D4C41]">First Name</label>
                    <input type="text" className="w-full border border-[#E5E7EB] rounded-lg p-2.5 bg-[#F5F5F0] outline-none focus:ring-2 focus:ring-[#2E7D32]/50" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#6D4C41]">Last Name</label>
                    <input type="text" className="w-full border border-[#E5E7EB] rounded-lg p-2.5 bg-[#F5F5F0] outline-none focus:ring-2 focus:ring-[#2E7D32]/50" placeholder="Doe" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-[#6D4C41]">Email</label>
                    <input type="email" className="w-full border border-[#E5E7EB] rounded-lg p-2.5 bg-[#F5F5F0] outline-none focus:ring-2 focus:ring-[#2E7D32]/50" placeholder="john@example.com" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4 border-b border-[#E5E7EB] pb-2 text-[#2C2C2C]">
                  Payment Method
                </h2>
                <div className="p-4 border border-[#E5E7EB] rounded-xl bg-white space-y-4">
                  <div className="flex items-center gap-3 text-[#2C2C2C]">
                    <CreditCard size={24} className="text-[#6D4C41]"/>
                    <span className="font-semibold">Credit or Debit Card</span>
                  </div>
                  <div className="space-y-3">
                    <input type="text" className="w-full border border-[#E5E7EB] rounded-lg p-2.5 bg-[#F5F5F0] outline-none focus:ring-2 focus:ring-[#2E7D32]/50" placeholder="Card Number" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" className="w-full border border-[#E5E7EB] rounded-lg p-2.5 bg-[#F5F5F0] outline-none focus:ring-2 focus:ring-[#2E7D32]/50" placeholder="MM/YY" />
                      <input type="text" className="w-full border border-[#E5E7EB] rounded-lg p-2.5 bg-[#F5F5F0] outline-none focus:ring-2 focus:ring-[#2E7D32]/50" placeholder="CVC" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="bg-[#F5F5F0] p-6 rounded-2xl border border-[#E5E7EB] sticky top-24">
                <h3 className="text-lg font-bold mb-4 text-[#2C2C2C] font-['Playfair_Display']">Order Summary</h3>
                <div className="space-y-3 mb-6 pb-6 border-b border-[#E5E7EB]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6D4C41]">Subtotal</span>
                    <span className="font-bold">{currency} {cost}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6D4C41]">Taxes & Fees</span>
                    <span className="font-bold">{currency} {(cost * 0.1).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold mb-6">
                  <span>Total</span>
                  <span className="text-[#2E7D32]">{currency} {(cost * 1.1).toFixed(2)}</span>
                </div>

                <Button className="w-full bg-[#F4A261] hover:bg-[#E67E22] text-white py-6 text-lg rounded-xl shadow-md font-bold mb-4" onClick={(e) => { e.preventDefault(); alert("Booking Confirmed! (UI Only)"); }}>
                  Confirm Booking
                </Button>

                <div className="space-y-2 mt-4 text-xs text-[#6D4C41]">
                  <p className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#2E7D32]"/> Secure checkout guaranteed</p>
                  <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#2E7D32]"/> Free cancellation up to 24h before</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
