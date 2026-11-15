'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  useCustomers,
  useFruits,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { signOut } from '@/lib/firebase/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { PageLoading } from '@/components/ui/Loading';
import {
  Store,
  Shield,
  Calendar,
  Database,
  LogOut,
  Download,
  Info,
  Check,
} from 'lucide-react';
import type { WeeklyStartDay } from '@/lib/types';

const WEEKDAYS = [
  { value: '1', label: 'Sunday' },
  { value: '2', label: 'Monday' },
  { value: '3', label: 'Tuesday' },
  { value: '4', label: 'Wednesday' },
  { value: '5', label: 'Thursday' },
  { value: '6', label: 'Friday' },
  { value: '7', label: 'Saturday' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isDemoMode } = useAuth();
  const { settings, loading, saveSettings } = useSettings();
  const { customers } = useCustomers();
  const { fruits } = useFruits();
  const { sales } = useAllSales();
  const { payments } = useAllPayments();
  const onlineStatus = useOnlineStatus();
  const { success, error: toastError } = useToast();

  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [weeklyStartDay, setWeeklyStartDay] = useState<WeeklyStartDay>(1);

  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (settings) {
      setOwnerName(settings.ownerName || '');
      setShopName(settings.shopName || '');
      setShopPhone(settings.shopPhone || '');
      setShopAddress(settings.shopAddress || '');
      setWhatsappNumber(settings.whatsappNumber || '');
      setWeeklyStartDay(settings.weeklyStartDay || 1);
    }
  }, [settings]);

  if (loading) return <PageLoading />;

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerName || !shopName || !shopPhone) {
      toastError('Please fill in required shop details');
      return;
    }

    setSaving(true);
    try {
      await saveSettings({
        ownerName: ownerName.trim(),
        shopName: shopName.trim(),
        shopPhone: shopPhone.trim(),
        shopAddress: shopAddress.trim(),
        whatsappNumber: whatsappNumber.trim() || shopPhone.trim(),
        weeklyStartDay,
      });
      success('Shop settings updated successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      if (isDemoMode) {
        const { setDemoUserLoggedIn } = await import('@/lib/demo/demoStore');
        setDemoUserLoggedIn(false);
      } else {
        await signOut();
      }
      router.replace('/login');
    } catch (err: any) {
      toastError(err.message || 'Failed to sign out');
      setSigningOut(false);
    }
  }

  function handleExportAllData() {
    const backup = {
      exportDate: new Date().toISOString(),
      shop: settings,
      customers,
      fruits,
      sales,
      payments,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Hisab_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('All shop data exported as JSON');
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header Profile */}
      <div className="flex items-center gap-4 p-4 sm:p-6 rounded-3xl bg-[#1A1A2E] text-white">
        <div className="w-14 h-14 rounded-2xl bg-[#1A9E6A] flex items-center justify-center font-bold text-xl text-white shrink-0">
          {shopName ? shopName.slice(0, 2).toUpperCase() : 'HB'}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">
            {shopName || 'Hisab Produce Shop'}
          </h1>
          <div className="text-xs text-gray-300 mt-0.5 truncate">
            Owner: {ownerName || 'Produce Owner'} • Phone: {shopPhone || 'No phone'}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
              {user?.email || (user?.phoneNumber ? `Phone: ${user.phoneNumber}` : 'Demo User')}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                onlineStatus === 'online'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {onlineStatus === 'online' ? 'Cloud Synced' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Shop Details */}
      <Card padding="md" className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#1A1A2E] font-bold text-base">
          <Store className="h-5 w-5 text-[#1A9E6A]" />
          Shop &amp; Produce Information
        </div>

        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name *"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
            <Input
              label="Owner Name *"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Phone *"
              type="tel"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              required
            />
            <Input
              label="WhatsApp Number"
              type="tel"
              placeholder="Leave empty to use shop phone"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
          </div>

          <Input
            label="Shop Address"
            placeholder="e.g. Shop #12, Wholesale Mandi, Mumbai"
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
          />

          {/* Section 2: Billing & Statement Configuration */}
          <div className="pt-4 border-t border-[#EBEBEB] space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A2E]">
              <Calendar className="h-4 w-4 text-[#007AFF]" />
              Weekly Statement Cycle
            </div>

            <Select
              label="Weekly Bill Starts On"
              value={weeklyStartDay.toString()}
              onChange={(e) => setWeeklyStartDay(Number(e.target.value) as WeeklyStartDay)}
              options={WEEKDAYS}
            />

            <div className="p-3 bg-gray-50 rounded-xl text-xs text-[#888888] flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-[#007AFF] mt-0.5" />
              <span>
                Weekly statements will calculate opening balance prior to this weekday, and include sales and payments from this day forward.
              </span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={saving}
          >
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Section 3: Security */}
      <Card padding="md" className="p-4 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#1A1A2E] font-bold text-base">
          <Shield className="h-5 w-5 text-purple-600" />
          Security &amp; Device Access
        </div>
        <p className="text-xs text-[#888888]">
          Face ID / Touch ID hardware biometrics are available only on the native iOS app. For web security, your session is authenticated via Firebase Auth tokens stored securely in standard browser storage.
        </p>
      </Card>

      {/* Section 4: Data Backup */}
      <Card padding="md" className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#1A1A2E] font-bold text-base">
          <Database className="h-5 w-5 text-amber-600" />
          Data &amp; Backup
        </div>
        <div className="text-xs text-[#888888]">
          Export all customers, produce items, sales entries, and payments as a structured JSON file for your local records or accounting backup.
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={handleExportAllData}
          icon={<Download className="h-4 w-4" />}
        >
          Export All Data (JSON)
        </Button>
      </Card>

      {/* Section 5: Sign Out */}
      <div className="pt-2">
        <Button
          variant="danger"
          size="lg"
          className="w-full"
          onClick={handleSignOut}
          loading={signingOut}
          icon={<LogOut className="h-4 w-4" />}
        >
          Sign Out of Hisab
        </Button>
      </div>
    </div>
  );
}
