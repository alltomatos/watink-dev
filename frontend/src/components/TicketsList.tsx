import React from "react";
import { useTicketsQuery } from "../../hooks/tickets/useTicketsQuery";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";

export const TicketsList: React.FC = () => {
  const { data, isLoading, error } = useTicketsQuery({ showAll: true });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading tickets</div>;

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.pages.flatMap((page) => page.tickets).map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>{ticket.id}</TableCell>
              <TableCell>
                <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell>{ticket.contact?.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
