import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Hotel {
  id: string
  name: string
  email: string
  city: string
  country: string
  rooms: number
  created_at: string
  subscriptions: Array<{
    plan_id: string
    status: string
    trial_end: string | null
    current_period_end: string | null
  }>
}

export function HotelsTable({ hotels }: { hotels: Hotel[] }) {
  return (
    <div className="rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
            <TableHead className="text-zinc-400">Hotel Name</TableHead>
            <TableHead className="text-zinc-400">Location</TableHead>
            <TableHead className="text-zinc-400">Rooms</TableHead>
            <TableHead className="text-zinc-400">Plan</TableHead>
            <TableHead className="text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-400">Created</TableHead>
            <TableHead className="text-zinc-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hotels.map((hotel) => {
            const subscription = hotel.subscriptions?.[0]
            const statusColor =
              subscription?.status === "active"
                ? "bg-green-500/10 text-green-500"
                : subscription?.status === "trialing"
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-red-500/10 text-red-500"

            return (
              <TableRow key={hotel.id} className="border-zinc-800 hover:bg-zinc-800/50">
                <TableCell className="font-medium text-white">{hotel.name}</TableCell>
                <TableCell className="text-zinc-400">
                  {hotel.city}, {hotel.country}
                </TableCell>
                <TableCell className="text-zinc-400">{hotel.rooms}</TableCell>
                <TableCell className="text-zinc-400">
                  {subscription?.plan_id ? (
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                      {subscription.plan_id}
                    </Badge>
                  ) : (
                    <span className="text-zinc-500">No plan</span>
                  )}
                </TableCell>
                <TableCell>
                  {subscription?.status ? (
                    <Badge className={statusColor}>{subscription.status}</Badge>
                  ) : (
                    <Badge className="bg-zinc-800 text-zinc-400">inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-zinc-400">{new Date(hotel.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Link href={`/admin/hotels/${hotel.id}`}>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-zinc-800">
                      View Details
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
