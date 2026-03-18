"use client"

import type { ComponentProps } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

interface PendingSubmitButtonProps extends ComponentProps<typeof Button> {
  idleText: string
  pendingText: string
}

function PendingSubmitButton({
  idleText,
  pendingText,
  disabled,
  children,
  name,
  value,
  ...props
}: PendingSubmitButtonProps) {
  const { pending, data } = useFormStatus()
  const isCurrentSubmitter = !pending
    ? false
    : !name
      ? true
      : data?.get(name) === `${value ?? ""}`
  const label = isCurrentSubmitter ? pendingText : idleText

  return (
    <Button type="submit" disabled={pending || disabled} name={name} value={value} {...props}>
      <span className="relative inline-grid place-items-center">
        <span className="col-start-1 row-start-1">{label}</span>
        <span className="invisible col-start-1 row-start-1" aria-hidden="true">
          {idleText}
        </span>
        <span className="invisible col-start-1 row-start-1" aria-hidden="true">
          {pendingText}
        </span>
      </span>
      {children}
    </Button>
  )
}

export { PendingSubmitButton }
export type { PendingSubmitButtonProps }
