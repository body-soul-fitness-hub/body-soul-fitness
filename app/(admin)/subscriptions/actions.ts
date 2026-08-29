"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeFinalPrice, type DiscountType, type DurationUnit } from "@/lib/plans/types";
import { addDays, addDuration, daysBetween, derivePaymentStatus, round2, type PaymentMode } from "@/lib/subscriptions/types";
import { computeInvoiceAmounts } from "@/lib/invoices/types";
import { DEFAULT_GYM_SETTINGS, GYM_SETTINGS_ID } from "@/lib/settings/types";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function searchMembers(query: string): Promise<Array<{ id: string; member_id: string; full_name: string; mobile_number: string }>> {
  const q = query.trim();
  if (!q) return [];
  const escaped = q.replace(/[%_,]/g, (match) => `\\${match}`);
  const { data } = await supabaseAdmin
    .from("members")
    .select("id, member_id, full_name, mobile_number")
    .or(`full_name.ilike.%${escaped}%,mobile_number.ilike.%${escaped}%,member_id.ilike.%${escaped}%`)
    .order("full_name")
    .limit(10);
  return (data ?? []) as Array<{ id: string; member_id: string; full_name: string; mobile_number: string }>;
}

export async function createSubscription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const memberId = str(formData, "member_id");
  const planId = str(formData, "plan_id");
  const planName = str(formData, "plan_name");
  const startDate = str(formData, "start_date") ?? new Date().toISOString().slice(0, 10);
  const durationUnit = str(formData, "duration_unit") as DurationUnit | null;
  const durationValue = num(formData, "duration_value");
  const standardPrice = num(formData, "standard_price");
  const discountType = (str(formData, "discount_type") as DiscountType | null) ?? null;
  const discountValue = num(formData, "discount_value") ?? 0;
  const finalAmountOverride = num(formData, "final_amount");
  const amountPaid = num(formData, "amount_paid") ?? 0;
  const paymentMode = str(formData, "payment_mode") as PaymentMode | null;
  const notes = str(formData, "notes");
  const createdBy = str(formData, "created_by");
  const renewedFromId = str(formData, "renewed_from_id");

  const fieldErrors: Record<string, string> = {};
  if (!memberId) fieldErrors.member_id = "Select a member.";
  if (!planId || !planName) fieldErrors.plan_id = "Select a plan.";
  if (!durationUnit || !durationValue || durationValue <= 0) fieldErrors.plan_id = "Select a plan.";
  if (standardPrice === null || standardPrice < 0) fieldErrors.standard_price = "Invalid plan price.";
  if (amountPaid < 0) fieldErrors.amount_paid = "Amount paid cannot be negative.";
  if (amountPaid > 0 && !paymentMode) fieldErrors.payment_mode = "Select a payment mode for the amount paid.";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const endDate = addDuration(startDate, durationUnit!, durationValue!);
  const finalAmount = finalAmountOverride !== null ? round2(Math.max(0, finalAmountOverride)) : computeFinalPrice(standardPrice!, discountType, discountValue);
  const discountAmount = Math.max(0, round2(standardPrice! - finalAmount));

  const { data: settingsRow } = await supabaseAdmin.from("gym_settings").select("tax_label, tax_rate").eq("id", GYM_SETTINGS_ID).maybeSingle();
  const taxLabel = settingsRow?.tax_label ?? DEFAULT_GYM_SETTINGS.tax_label;
  const taxRate = settingsRow?.tax_rate ?? DEFAULT_GYM_SETTINGS.tax_rate;
  const { taxAmount, totalAmount } = computeInvoiceAmounts(finalAmount, 0, taxRate);

  const balanceDue = Math.max(0, round2(totalAmount - amountPaid));
  const paymentStatus = derivePaymentStatus(totalAmount, amountPaid);

  const { data: sub, error } = await supabaseAdmin
    .from("member_subscriptions")
    .insert({
      member_id: memberId,
      plan_id: planId,
      plan_name: planName,
      duration_unit: durationUnit,
      duration_value: durationValue,
      start_date: startDate,
      end_date: endDate,
      standard_price: standardPrice,
      discount_type: discountType,
      discount_value: discountValue,
      final_amount: finalAmount,
      payment_status: paymentStatus,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_mode: amountPaid > 0 ? paymentMode : null,
      notes,
      status: "active",
      renewed_from_id: renewedFromId,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error || !sub) return { error: error?.message ?? "Could not create the subscription." };

  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: sub.id,
    member_id: memberId,
    event_type: renewedFromId ? "renewed" : "created",
    details: renewedFromId ? `Renewed as ${planName} (${startDate} → ${endDate}).` : `Subscribed to ${planName} (${startDate} → ${endDate}).`,
    performed_by: createdBy,
  });

  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .insert({
      member_id: memberId,
      subscription_id: sub.id,
      issue_date: startDate,
      plan_name: planName,
      duration_unit: durationUnit,
      duration_value: durationValue,
      start_date: startDate,
      end_date: endDate,
      amount: standardPrice,
      discount_amount: discountAmount,
      tax_label: taxAmount > 0 ? taxLabel : null,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_mode: amountPaid > 0 ? paymentMode : null,
      status: paymentStatus,
      notes,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (amountPaid > 0) {
    await supabaseAdmin.from("member_payments").insert({
      member_id: memberId,
      subscription_id: sub.id,
      invoice_id: invoice?.id ?? null,
      amount: amountPaid,
      payment_date: startDate,
      method: paymentMode,
      notes: "Initial payment at subscription creation.",
      received_by: createdBy,
    });
  }

  revalidatePath("/subscriptions");
  revalidatePath("/payments");
  revalidatePath(`/members/${memberId}`);
  redirect(`/subscriptions/${sub.id}`);
}

export async function extendSubscription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "subscription_id");
  const days = num(formData, "extend_days");
  const performedBy = str(formData, "performed_by");
  if (!id) return { error: "Subscription not found." };
  if (!days || days <= 0) return { fieldErrors: { extend_days: "Enter a number of days greater than zero." } };

  const { data: sub, error: fetchError } = await supabaseAdmin.from("member_subscriptions").select("id, member_id, end_date, status").eq("id", id).single();
  if (fetchError || !sub) return { error: "Subscription not found." };
  if (sub.status === "cancelled") return { error: "A cancelled subscription cannot be extended." };

  const base = sub.end_date ?? new Date().toISOString().slice(0, 10);
  const newEndDate = addDays(base, days);

  const { error } = await supabaseAdmin.from("member_subscriptions").update({ end_date: newEndDate, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };

  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: id,
    member_id: sub.member_id,
    event_type: "extended",
    details: `Extended by ${days} day${days === 1 ? "" : "s"} (end date ${base} → ${newEndDate}).`,
    performed_by: performedBy,
  });

  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/subscriptions");
  revalidatePath(`/members/${sub.member_id}`);
  return {};
}

export async function freezeSubscription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "subscription_id");
  const reason = str(formData, "freeze_reason");
  const performedBy = str(formData, "performed_by");
  if (!id) return { error: "Subscription not found." };
  if (!reason) return { fieldErrors: { freeze_reason: "A reason is required to freeze a subscription." } };

  const { data: sub, error: fetchError } = await supabaseAdmin.from("member_subscriptions").select("id, member_id, status").eq("id", id).single();
  if (fetchError || !sub) return { error: "Subscription not found." };
  if (sub.status !== "active") return { error: "Only an active subscription can be frozen." };

  const { error } = await supabaseAdmin
    .from("member_subscriptions")
    .update({ status: "frozen", frozen_at: new Date().toISOString(), freeze_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: id,
    member_id: sub.member_id,
    event_type: "frozen",
    details: `Frozen — ${reason}`,
    performed_by: performedBy,
  });

  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/subscriptions");
  revalidatePath(`/members/${sub.member_id}`);
  return {};
}

export async function unfreezeSubscription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "subscription_id");
  const performedBy = str(formData, "performed_by");
  const extendForFrozenDays = formData.get("extend_for_frozen_days") === "on";
  if (!id) return { error: "Subscription not found." };

  const { data: sub, error: fetchError } = await supabaseAdmin.from("member_subscriptions").select("id, member_id, status, end_date, frozen_at").eq("id", id).single();
  if (fetchError || !sub) return { error: "Subscription not found." };
  if (sub.status !== "frozen") return { error: "This subscription is not frozen." };

  let newEndDate = sub.end_date as string | null;
  let extendNote = "";
  if (extendForFrozenDays && sub.end_date && sub.frozen_at) {
    const frozenSince = (sub.frozen_at as string).slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const frozenDays = Math.max(0, daysBetween(frozenSince, today));
    if (frozenDays > 0) {
      newEndDate = addDays(sub.end_date as string, frozenDays);
      extendNote = ` End date extended by ${frozenDays} frozen day${frozenDays === 1 ? "" : "s"} (${sub.end_date} → ${newEndDate}).`;
    }
  }

  const { error } = await supabaseAdmin
    .from("member_subscriptions")
    .update({ status: "active", end_date: newEndDate, frozen_at: null, freeze_reason: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: id,
    member_id: sub.member_id,
    event_type: "unfrozen",
    details: `Resumed from freeze.${extendNote}`,
    performed_by: performedBy,
  });

  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/subscriptions");
  revalidatePath(`/members/${sub.member_id}`);
  return {};
}

export async function cancelSubscription(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "subscription_id");
  const reason = str(formData, "cancel_reason");
  const performedBy = str(formData, "performed_by");
  if (!id) return { error: "Subscription not found." };
  if (!reason) return { fieldErrors: { cancel_reason: "A reason is required to cancel a subscription." } };

  const { data: sub, error: fetchError } = await supabaseAdmin.from("member_subscriptions").select("id, member_id, status").eq("id", id).single();
  if (fetchError || !sub) return { error: "Subscription not found." };
  if (sub.status === "cancelled") return {};

  const { error } = await supabaseAdmin
    .from("member_subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: id,
    member_id: sub.member_id,
    event_type: "cancelled",
    details: `Cancelled — ${reason}`,
    performed_by: performedBy,
  });

  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/subscriptions");
  revalidatePath(`/members/${sub.member_id}`);
  return {};
}

export async function recordSubscriptionPayment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "subscription_id");
  const amount = num(formData, "amount");
  const paymentMode = str(formData, "payment_mode") as PaymentMode | null;
  const reference = str(formData, "reference");
  const notes = str(formData, "notes");
  const performedBy = str(formData, "performed_by");
  if (!id) return { error: "Subscription not found." };
  if (!amount || amount <= 0) return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  if (!paymentMode) return { fieldErrors: { payment_mode: "Select a payment mode." } };

  const { data: sub, error: fetchError } = await supabaseAdmin.from("member_subscriptions").select("id, member_id, final_amount, amount_paid").eq("id", id).single();
  if (fetchError || !sub) return { error: "Subscription not found." };

  const { data: invoice } = await supabaseAdmin.from("invoices").select("id, total_amount, amount_paid").eq("subscription_id", id).maybeSingle();
  const totalAmount = (invoice?.total_amount as number | undefined) ?? (sub.final_amount as number);
  const currentAmountPaid = (invoice?.amount_paid as number | undefined) ?? (sub.amount_paid as number);

  const newAmountPaid = round2(currentAmountPaid + amount);
  const newBalance = Math.max(0, round2(totalAmount - newAmountPaid));
  const newStatus = derivePaymentStatus(totalAmount, newAmountPaid);

  const { error } = await supabaseAdmin
    .from("member_subscriptions")
    .update({ amount_paid: newAmountPaid, balance_due: newBalance, payment_status: newStatus, payment_mode: paymentMode, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  if (invoice) {
    await supabaseAdmin
      .from("invoices")
      .update({ amount_paid: newAmountPaid, balance_due: newBalance, status: newStatus, payment_mode: paymentMode, updated_at: new Date().toISOString() })
      .eq("id", invoice.id);
  }

  await supabaseAdmin.from("member_payments").insert({
    member_id: sub.member_id,
    subscription_id: id,
    invoice_id: invoice?.id ?? null,
    amount,
    payment_date: new Date().toISOString().slice(0, 10),
    method: paymentMode,
    reference,
    notes,
    received_by: performedBy,
  });

  await supabaseAdmin.from("subscription_events").insert({
    subscription_id: id,
    member_id: sub.member_id,
    event_type: "payment_recorded",
    details: `Payment recorded: ₹${amount.toLocaleString("en-IN")} via ${paymentMode}.`,
    performed_by: performedBy,
  });

  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/subscriptions");
  revalidatePath("/payments");
  revalidatePath(`/members/${sub.member_id}`);
  return {};
}
