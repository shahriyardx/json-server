"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Container } from "@/components/container"
import { Send } from "lucide-react"

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject too long"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message too long"),
})

type ContactForm = z.infer<typeof contactSchema>

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (_data: ContactForm) => {
    await new Promise((r) => setTimeout(r, 600))
    toast.success("Message sent! We'll get back to you soon.")
    reset()
  }

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Contact
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Have a question, bug report, or feature request? Send a message.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                {...register("name")}
                placeholder="Your name"
                data-invalid={!!errors.name}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                data-invalid={!!errors.email}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field>
              <FieldLabel>Subject</FieldLabel>
              <Input
                {...register("subject")}
                placeholder="What is this about?"
                data-invalid={!!errors.subject}
              />
              <FieldError errors={[errors.subject]} />
            </Field>
            <Field>
              <FieldLabel>Message</FieldLabel>
              <textarea
                {...register("message")}
                rows={6}
                placeholder="Describe your issue or question..."
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                data-invalid={!!errors.message}
              />
              <FieldError errors={[errors.message]} />
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Send className="size-4" />
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>

        <p className="mt-8 text-xs text-muted-foreground">
          Prefer GitHub?{" "}
          <Link
            href="https://github.com/shahriyardx/json-server"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Open an issue
          </Link>{" "}
          instead. For privacy matters, see{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </Container>
  )
}
