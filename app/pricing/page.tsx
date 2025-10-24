"use client"

import { useState } from "react"
import { Bell, Check, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const STRIPE_PAYMENT_LINKS = {
  starter_monthly: "https://buy.stripe.com/test_REPLACE_WITH_YOUR_STARTER_MONTHLY_LINK",
  starter_yearly: "https://buy.stripe.com/test_REPLACE_WITH_YOUR_STARTER_YEARLY_LINK",
  professional_monthly: "https://buy.stripe.com/test_REPLACE_WITH_YOUR_PROFESSIONAL_MONTHLY_LINK",
  professional_yearly: "https://buy.stripe.com/test_REPLACE_WITH_YOUR_PROFESSIONAL_YEARLY_LINK",
}

const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small hotels",
    priceMonthly: 49,
    priceYearly: 490,
    popular: false,
    features: ["Up to 50 rooms", "Basic task management", "Email support", "Mobile app access", "Basic reporting"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing properties",
    priceMonthly: 99,
    priceYearly: 990,
    popular: true,
    features: [
      "Up to 200 rooms",
      "Advanced task management",
      "Priority support",
      "Mobile app access",
      "Advanced reporting",
      "Custom integrations",
      "Team collaboration tools",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large hotel chains",
    priceMonthly: 0,
    priceYearly: 0,
    popular: false,
    features: [
      "Unlimited rooms",
      "Enterprise task management",
      "24/7 dedicated support",
      "Mobile app access",
      "Custom reporting",
      "API access",
      "White-label options",
      "Multi-property management",
    ],
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  const getPaymentLink = (planId: string, billing: "monthly" | "yearly") => {
    if (planId === "starter" && billing === "monthly") return STRIPE_PAYMENT_LINKS.starter_monthly
    if (planId === "starter" && billing === "yearly") return STRIPE_PAYMENT_LINKS.starter_yearly
    if (planId === "professional" && billing === "monthly") return STRIPE_PAYMENT_LINKS.professional_monthly
    if (planId === "professional" && billing === "yearly") return STRIPE_PAYMENT_LINKS.professional_yearly
    return "#"
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <span className="text-xl font-bold">TheBell</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back to Website</span>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="mx-auto max-w-7xl px-6 py-32">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">Simple, transparent pricing</h1>
          <p className="text-xl text-gray-600 mb-8">Choose the plan that fits your hotel</p>

          <div className="inline-flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === "monthly" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === "yearly" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-600">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan, index) => {
            const price = billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly
            const isPopular = plan.popular
            const isEnterprise = plan.id === "enterprise"

            return (
              <div
                key={plan.id}
                className={`rounded-lg p-8 ${
                  isPopular ? "border-2 border-gray-900 bg-gray-50 relative" : "border border-gray-200 bg-gray-50"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    {isEnterprise ? (
                      <span className="text-5xl font-bold">Custom</span>
                    ) : (
                      <>
                        <span className="text-5xl font-bold">${price}</span>
                        <span className="text-gray-600">/{billingPeriod === "monthly" ? "mo" : "yr"}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <Link href="/demo">
                    <Button className="w-full bg-transparent" variant="outline">
                      Contact sales
                    </Button>
                  </Link>
                ) : (
                  <a href={getPaymentLink(plan.id, billingPeriod)} target="_blank" rel="noopener noreferrer">
                    <Button
                      className={`w-full ${isPopular ? "bg-gray-900 text-white hover:bg-gray-800" : ""}`}
                      variant={isPopular ? "default" : "outline"}
                    >
                      Get started
                    </Button>
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="text-center text-sm text-gray-600">© 2025 TheBell. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
