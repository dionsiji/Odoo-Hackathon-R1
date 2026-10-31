import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Filter, Clock, User, Shield } from 'lucide-react';
import api from '../../lib/api';
import {
  PageHeader, Card, Button, Badge, EmptyState, Spinner,
  Select, Table, Th, Td, Tr,
} from '../../components/ui';

const ACTION_VARIANT = {
  PAYMENT_RECORDED: 'success',
  CREATED: 'info',
  UPDATED: 'neutral',
  STATUS_CHANGED: 'warning',
  ACTIVATED: 'success',
  PAUSED: 'warning',
  RESUMED: 'info',
  RENEWED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
  VOIDED: 'neutral',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [objectType, setObjectType] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (objectType) params.append('object_type', objectType);
      if (actionFilter) params.append('action', actionFilter);

      const { data } = await api.get(`/activity-logs/?${params.toString()}`);
      setLogs(Array.isArray(data) ? data : data.results ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [objectType, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Audit & Activity Logs"
        subtitle="Immutable track of all system, admin, and billing events"
        actions={
          <Button variant="secondary" onClick={fetchLogs}>
            <RefreshCw size={15} /> Refresh
          </Button>
        }
      />

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-64">
            <Select
              label="Filter by Entity"
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              options={[
                { value: '', label: 'All Entities' },
                { value: 'Invoice', label: 'Invoice' },
                { value: 'Subscription', label: 'Subscription' },
                { value: 'Quotation', label: 'Quotation' },
                { value: 'Payment', label: 'Payment' },
                { value: 'CustomerProfile', label: 'Customer' },
              ]}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              label="Filter by Action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'PAYMENT_RECORDED', label: 'Payment Recorded' },
                { value: 'STATUS_CHANGED', label: 'Status Changed' },
                { value: 'CREATED', label: 'Created' },
                { value: 'UPDATED', label: 'Updated' },
                { value: 'REFUNDED', label: 'Refunded' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
          {(objectType || actionFilter) && (
            <div className="sm:self-end pb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setObjectType('');
                  setActionFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size={32} className="text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity logs found"
            description="Events and changes will automatically appear here once recorded."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Timestamp</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Target Object</Th>
                  <Th>Metadata / Details</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <Tr key={log.id}>
                    <Td className="text-xs text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-500" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </Td>
                    <Td className="text-sm text-gray-200">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-blue-400" />
                        <span>{log.actor_email || 'System / Automated'}</span>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={ACTION_VARIANT[log.action] || 'neutral'}>
                        {log.action}
                      </Badge>
                    </Td>
                    <Td className="text-sm">
                      <span className="text-gray-300 font-medium">
                        {log.object_type}
                      </span>
                      {log.object_repr && (
                        <span className="text-xs text-gray-500 block truncate max-w-xs">
                          {log.object_repr}
                        </span>
                      )}
                    </Td>
                    <Td className="text-xs text-gray-400 font-mono">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <div className="max-w-md bg-gray-850 p-1.5 rounded border border-gray-800 break-all">
                          {typeof log.metadata === 'object'
                            ? JSON.stringify(log.metadata)
                            : String(log.metadata)}
                        </div>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
