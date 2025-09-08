"use client"

import * as React from "react"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"

export interface DateRangePreset {
  label: string
  value: string
  range: () => DateRange
}

export interface DateRangePresetGroup {
  label: string
  presets: DateRangePreset[]
}

const dateRangePresetGroups: DateRangePresetGroup[] = [
  {
    label: "Días específicos",
    presets: [
      {
        label: "Hoy",
        value: "today",
        range: () => ({
          from: startOfDay(new Date()),
          to: endOfDay(new Date()),
        }),
      },
      {
        label: "Ayer",
        value: "yesterday",
        range: () => ({
          from: startOfDay(subDays(new Date(), 1)),
          to: endOfDay(subDays(new Date(), 1)),
        }),
      },
    ]
  },
  {
    label: "Por semana",
    presets: [
      {
        label: "Esta semana",
        value: "this_week",
        range: () => ({
          from: startOfWeek(new Date(), { weekStartsOn: 1 }),
          to: endOfWeek(new Date(), { weekStartsOn: 1 }),
        }),
      },
      {
        label: "Semana pasada",
        value: "last_week",
        range: () => {
          const lastWeek = subWeeks(new Date(), 1)
          return {
            from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
            to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
          }
        },
      },
    ]
  },
  {
    label: "Por mes",
    presets: [
      {
        label: "Este mes",
        value: "this_month",
        range: () => ({
          from: startOfMonth(new Date()),
          to: endOfMonth(new Date()),
        }),
      },
      {
        label: "Mes pasado",
        value: "last_month",
        range: () => {
          const lastMonth = subMonths(new Date(), 1)
          return {
            from: startOfMonth(lastMonth),
            to: endOfMonth(lastMonth),
          }
        },
      },
    ]
  },
]

// Flatten presets for backward compatibility
const dateRangePresets = dateRangePresetGroups.flatMap(group => group.presets)

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (dateRange: DateRange | undefined) => void
  placeholder?: string
  className?: string
  align?: "start" | "end" | "center"
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Seleccionar período",
  className,
  align = "start",
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value)
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(value)
  const [selectedPreset, setSelectedPreset] = React.useState<string>("")
  const [isOpen, setIsOpen] = React.useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  React.useEffect(() => {
    setDate(value)
    setTempDate(value)
  }, [value])

  const handleDateChange = (newDate: DateRange | undefined) => {
    setTempDate(newDate)
    setSelectedPreset("")
  }

  const handlePresetChange = (presetValue: string) => {
    const preset = dateRangePresets.find(p => p.value === presetValue)
    if (preset) {
      const newRange = preset.range()
      setTempDate(newRange)
      setSelectedPreset(presetValue)
      
      // Auto-apply preset selection and close popover
      setDate(newRange)
      onChange?.(newRange)
      setIsOpen(false)
    }
  }

  const handleApply = () => {
    setDate(tempDate)
    onChange?.(tempDate)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempDate(date)
    setSelectedPreset("")
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setTempDate(date)
    }
  }

  const formatDateRange = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) return placeholder

    if (dateRange.to) {
      return `${format(dateRange.from, "dd MMM, yyyy", { locale: es })} - ${format(dateRange.to, "dd MMM, yyyy", { locale: es })}`
    }

    return format(dateRange.from, "dd MMM, yyyy", { locale: es })
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-auto min-w-[240px] max-w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 max-w-[min(calc(100vw-2rem),800px)]" align={align}>
          <div className="flex flex-col space-y-4 p-4">
            {/* Select dropdown with better spacing */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Período rápido</label>
              <Select
                value={selectedPreset}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {dateRangePresetGroups.map((group, groupIndex) => (
                    <React.Fragment key={group.label}>
                      <SelectGroup>
                        <SelectLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          {group.label}
                        </SelectLabel>
                        {group.presets.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      {groupIndex < dateRangePresetGroups.length - 1 && (
                        <SelectSeparator />
                      )}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Calendar with responsive layout and better spacing */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">O selecciona fechas manualmente</label>
              <div className="rounded-md border bg-background">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={tempDate?.from}
                  selected={tempDate}
                  onSelect={handleDateChange}
                  numberOfMonths={isMobile ? 1 : 2}
                  locale={es}
                  className="p-3"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                    row: "flex w-full mt-2",
                    cell: cn(
                      "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                      "h-9 w-9 sm:h-10 sm:w-10", // Better touch targets
                      "[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50"
                    ),
                    day: cn(
                      "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "h-9 w-9 sm:h-10 sm:w-10 p-0", // Larger touch targets on mobile
                      "hover:bg-accent hover:text-accent-foreground",
                      "aria-selected:opacity-100"
                    ),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible"
                  }}
                />
              </div>
            </div>
            
            {/* Action buttons - only show when custom date is selected without preset */}
            {tempDate && !selectedPreset && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleApply}
                  disabled={!tempDate?.from}
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}