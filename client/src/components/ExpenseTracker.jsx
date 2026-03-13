import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { User, DollarSign, Plus, Trash2, ArrowRight } from "lucide-react";
import axios from "axios";
export default function ExpenseTracker({ tripId, currentUserId, members }) {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId || "");
  const [splitType, setSplitType] = useState("equal");

  // Initialize split amounts for all members
  const [splitDetails, setSplitDetails] = useState({});

  useEffect(() => {
    if (members && members.length > 0) {
      if (!currentUserId && members[0]) {
        setPaidBy(members[0]._id);
      }
      resetSplitDetails();
    }
  }, [members, currentUserId]);

  const resetSplitDetails = () => {
    const defaultSplits = {};
    members.forEach((m) => {
      defaultSplits[m._id] = { included: true, amount: 0, percentage: 0 };
    });
    setSplitDetails(defaultSplits);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, balancesRes] = await Promise.all([
        api.get(`expenses/${tripId}`),
        api.get(`expenses/${tripId}/balances`),
      ]);

      setExpenses(expensesRes.data.data);
      setBalances(balancesRes.data.data.balances);
      setTransactions(balancesRes.data.data.transactions);
    } catch (error) {
      console.error("Error fetching expense data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      fetchData();
    }
  }, [tripId]);

  // Recalculate amounts based on split type
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;

    if (splitType === "equal") {
      const activeMembers = Object.keys(splitDetails).filter(
        (id) => splitDetails[id].included,
      );
      const splitAmount =
        activeMembers.length > 0 ? numAmount / activeMembers.length : 0;

      setSplitDetails((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (next[id].included) {
            next[id].amount = splitAmount;
          } else {
            next[id].amount = 0;
          }
        });
        return next;
      });
    } else if (splitType === "percentage") {
      setSplitDetails((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          next[id].amount = (numAmount * (next[id].percentage || 0)) / 100;
        });
        return next;
      });
    }
    // "custom" type handles input directly in its own fields
  }, [amount, splitType, splitDetails.included]); // don't track the whole object to avoid infinite loop

  const handleSplitChange = (userId, field, value) => {
    setSplitDetails((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));

    // For manual updates to equality toggle
    if (field === "included" && splitType === "equal") {
      const numAmount = parseFloat(amount) || 0;
      const activeMembers = Object.keys(splitDetails).filter((id) =>
        id === userId ? value : splitDetails[id].included,
      );
      const splitAmount =
        activeMembers.length > 0 ? numAmount / activeMembers.length : 0;

      setSplitDetails((prev) => {
        const next = {
          ...prev,
          [userId]: { ...prev[userId], included: value },
        };
        Object.keys(next).forEach((id) => {
          if (next[id].included) {
            next[id].amount = splitAmount;
          } else {
            next[id].amount = 0;
          }
        });
        return next;
      });
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount || !paidBy) return;

    const numAmount = parseFloat(amount);

    // Validate custom/percentage totals
    let total = 0;
    Object.values(splitDetails).forEach((detail) => {
      total += parseFloat(detail.amount || 0);
    });

    if (Math.abs(total - numAmount) > 0.1) {
      alert("Split amounts must sum up to the total amount.");
      return;
    }

    const participantsForDb = [];
    const splitForDb = [];

    members.forEach((m) => {
      const userId = m._id;
      if (splitDetails[userId].amount > 0 || splitType === "equal") {
        participantsForDb.push({
          participant_id: userId,
          name: m.username || m.name || "Unknown",
        });

        splitForDb.push({
          participant_id: userId,
          amount: parseFloat(splitDetails[userId].amount.toFixed(2)),
        });
      }
    });

    try {
      await api.post(`expenses/${tripId}`, {
        description,
        amount: numAmount,
        paid_by: paidBy,
        split_type: splitType,
        participants: participantsForDb,
        split_details: splitForDb,
      });

      // Reset form
      setDescription("");
      setAmount("");
      setShowAddForm(false);
      resetSplitDetails();

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(error.response?.data?.message || "Failed to add expense");
    }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await api.delete(`expenses/${tripId}/${expenseId}`);
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense");
    }
  };

  if (!members || members.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-4">
          Trip Expenses
        </h2>
        <p className="text-sm text-[#6D4C41]">
          No members found to split expenses with.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 relative font-['Lato'] text-[#2C2C2C] bg-[#F5F5F0] rounded-[14px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-['Playfair_Display'] text-[#2C2C2C] flex items-center gap-2">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-[#2E7D32]" />
            Expenses & Balances (₹)
          </h2>
          <p className="text-base text-[#6D4C41] mt-2">
            Split costs fairly and seamlessly with your travel companions.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#2E7D32] hover:bg-[#1b4b1e] text-white px-5 py-2.5 rounded-xl text-base font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          {showAddForm ? (
            "Cancel"
          ) : (
            <>
              <Plus size={20} /> Add Expense
            </>
          )}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddExpense}
          className="mb-10 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#E5E7EB]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-[#6D4C41] uppercase tracking-wider mb-2">
                Description
              </label>
              <input
                required
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner, Taxi, Museum tickets"
                className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/50 focus:border-[#2E7D32] text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6D4C41] uppercase tracking-wider mb-2">
                Amount (₹)
              </label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/50 focus:border-[#2E7D32] text-lg font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-[#6D4C41] uppercase tracking-wider mb-2">
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-4 py-3 bg-[#F5F5F0] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/50 focus:border-[#2E7D32] text-lg appearance-none"
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.username || m.name}{" "}
                    {m._id === currentUserId ? "(You)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#6D4C41] uppercase tracking-wider mb-2">
                Split Type
              </label>
              <div className="flex bg-[#F5F5F0] rounded-xl border border-[#E5E7EB] overflow-hidden p-1">
                {["equal", "custom", "percentage"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={`flex-1 py-2.5 text-base text-center capitalize rounded-lg transition-all ${
                      splitType === type
                        ? "bg-white text-[#2E7D32] font-bold shadow-sm"
                        : "text-[#6D4C41] hover:text-[#2C2C2C]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-6 mb-8">
            <h3 className="text-lg font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-4">
              Split Details
            </h3>
            <div className="space-y-3">
              {members.map((m) => {
                const userId = m._id;
                const details = splitDetails[userId] || {
                  included: true,
                  amount: 0,
                  percentage: 0,
                };

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between bg-[#F5F5F0] p-4 rounded-xl border border-[#E5E7EB]"
                  >
                    <div className="flex items-center gap-3">
                      {splitType === "equal" && (
                        <input
                          type="checkbox"
                          checked={details.included}
                          onChange={(e) =>
                            handleSplitChange(
                              userId,
                              "included",
                              e.target.checked,
                            )
                          }
                          className="w-5 h-5 text-[#2E7D32] rounded border-gray-300 focus:ring-[#2E7D32]"
                        />
                      )}
                      <p className="text-lg font-medium text-[#2C2C2C]">
                        {m.username || m.name}{" "}
                        {userId === currentUserId && (
                          <span className="text-[#6D4C41] font-normal italic text-base">(You)</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {splitType === "equal" && (
                        <span className="text-lg font-bold text-[#2E7D32]">
                          ₹
                          {details.amount > 0
                            ? details.amount.toFixed(2)
                            : "0.00"}
                        </span>
                      )}

                      {splitType === "custom" && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#6D4C41]">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={details.amount || ""}
                            onChange={(e) =>
                              handleSplitChange(
                                userId,
                                "amount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-24 px-3 py-2 text-lg font-medium border border-[#E5E7EB] bg-white rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/50"
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {splitType === "percentage" && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={details.percentage || ""}
                              onChange={(e) =>
                                handleSplitChange(
                                  userId,
                                  "percentage",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-20 px-3 py-2 text-lg font-medium border border-[#E5E7EB] bg-white rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/50"
                              placeholder="0"
                            />
                            <span className="text-lg font-bold text-[#6D4C41]">
                              %
                            </span>
                          </div>
                          <span className="text-lg font-bold text-[#2E7D32] w-20 text-right">
                            ₹
                            {details.amount > 0
                              ? details.amount.toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#F4A261] hover:bg-[#e69352] text-white py-4 rounded-xl text-lg font-bold transition-colors shadow-sm"
          >
            Save Expense
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-lg font-medium text-[#6D4C41]">
          Loading expenses...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Expenses List */}
          <div>
            <h3 className="text-xl md:text-2xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-6 border-b border-[#E5E7EB] pb-3">
              Recent Expenses
            </h3>
            {expenses.length === 0 ? (
              <p className="text-base text-[#6D4C41] py-4 italic">
                No expenses added yet. Start by clicking "Add Expense".
              </p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {expenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-center justify-between group hover:border-[#2E7D32]/30 transition-colors"
                  >
                    <div>
                      <p className="text-lg font-bold text-[#2C2C2C]">
                        {expense.description}
                      </p>
                      <p className="text-sm text-[#6D4C41] mt-2 flex items-center gap-1.5">
                        <User size={14} className="text-[#F4A261]" /> Paid by{" "}
                        <span className="font-semibold text-[#2C2C2C]">
                          {expense.paid_by?.username ||
                            expense.paid_by?.name ||
                            "Unknown"}
                        </span>
                        <span className="mx-1.5 text-[#E5E7EB]">•</span>
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-xl text-[#2E7D32]">
                        ₹{expense.amount.toFixed(2)}
                      </span>
                      {expense.paid_by?._id === currentUserId && (
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="text-[#6D4C41]/50 hover:text-red-500 mt-2 cursor-pointer transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          title="Delete Expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balances & Simplification */}
          <div>
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#E5E7EB]">
              <h3 className="text-xl md:text-2xl font-bold font-['Playfair_Display'] text-[#2C2C2C] mb-6 border-b border-[#E5E7EB] pb-3">
                How to settle up
              </h3>

              {transactions.length === 0 ? (
                <p className="text-base text-[#6D4C41] py-8 text-center italic">
                  All settled up! No one owes anything.
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F5F5F0] p-5 rounded-xl border border-[#E5E7EB] gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-10 h-10 rounded-full bg-[#6D4C41]/10 flex items-center justify-center text-[#6D4C41] font-bold text-base shadow-sm shrink-0">
                            {tx.fromName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-base font-bold text-[#6D4C41] truncate">
                            {tx.fromName}
                          </span>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center px-2 shrink-0">
                          <span className="text-xs uppercase tracking-wider font-bold text-[#F4A261] mb-1">owes</span>
                          <ArrowRight size={16} className="text-[#F4A261]" />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 flex-1">
                          <span className="text-base font-bold text-[#2C2C2C] truncate text-right">
                            {tx.toName}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-[#2E7D32]/10 flex items-center justify-center text-[#2E7D32] font-bold text-base shadow-sm shrink-0">
                            {tx.toName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="font-bold text-xl text-[#2E7D32] whitespace-nowrap sm:pl-4 sm:border-l border-[#E5E7EB] text-center sm:text-right">
                        ₹{tx.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual Balances Details */}
              <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#6D4C41] mb-4">
                  Individual Balances
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.values(balances).map((b, idx) => {
                    if (Math.abs(b.amount) < 0.01) return null; // Skip settled

                    const isPositive = b.amount > 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-[#F5F5F0] rounded-xl border border-[#E5E7EB]"
                      >
                        <span className="font-bold text-[#2C2C2C] text-base truncate pr-2">
                          {b.name}
                        </span>
                        <span
                          className={`font-bold text-lg whitespace-nowrap ${isPositive ? "text-[#2E7D32]" : "text-red-500"}`}
                        >
                          {isPositive ? "+" : ""}₹{b.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
