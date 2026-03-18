import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function FormActions({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap justify-end gap-2", className)} {...props} />
}

export { FormActions }
