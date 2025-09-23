import React, { useState, useEffect } from 'react';
import type { UserAddress, CreateAddressRequest, UpdateAddressRequest } from '../services/api';
import Button from './Button';
import Input from './Input';
import LoadingSpinner from './LoadingSpinner';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (addressData: CreateAddressRequest | UpdateAddressRequest) => Promise<void>;
  address?: UserAddress | null;
  loading?: boolean;
  title?: string;
}

const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSave,
  address,
  loading = false,
  title
}) => {
  const [formData, setFormData] = useState<CreateAddressRequest>({
    streetAddress: '',
    city: '',
    postalCode: '',
    country: '',
    state: '',
    addressType: 'SHIPPING',
    isDefault: false
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (address) {
      setFormData({
        streetAddress: address.streetAddress,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        state: address.state || '',
        addressType: address.addressType,
        isDefault: address.isDefault
      });
    } else {
      setFormData({
        streetAddress: '',
        city: '',
        postalCode: '',
        country: '',
        state: '',
        addressType: 'SHIPPING',
        isDefault: false
      });
    }
    setFormErrors({});
  }, [address, isOpen]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.streetAddress.trim()) {
      errors.streetAddress = 'L\'indirizzo è obbligatorio';
    }
    if (!formData.city.trim()) {
      errors.city = 'La città è obbligatoria';
    }
    if (!formData.postalCode.trim()) {
      errors.postalCode = 'Il CAP è obbligatorio';
    }
    if (!formData.country.trim()) {
      errors.country = 'Il paese è obbligatorio';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      streetAddress: '',
      city: '',
      postalCode: '',
      country: '',
      state: '',
      addressType: 'SHIPPING',
      isDefault: false
    });
    setFormErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {title || (address ? 'Modifica Indirizzo' : 'Nuovo Indirizzo')}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Address Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Indirizzo
              </label>
              <select
                value={formData.addressType}
                onChange={(e) => setFormData({
                  ...formData,
                  addressType: e.target.value as 'SHIPPING' | 'BILLING'
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="SHIPPING">Spedizione</option>
                <option value="BILLING">Fatturazione</option>
              </select>
            </div>

            {/* Street Address */}
            <div>
              <Input
                label="Indirizzo"
                value={formData.streetAddress}
                onChange={(e) => setFormData({...formData, streetAddress: e.target.value})}
                fullWidth
                error={formErrors.streetAddress}
                disabled={loading}
                placeholder="Es. Via Roma 123"
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Città"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                error={formErrors.city}
                disabled={loading}
                placeholder="Es. Milano"
              />
              <Input
                label="CAP"
                value={formData.postalCode}
                onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                error={formErrors.postalCode}
                disabled={loading}
                placeholder="Es. 20100"
              />
            </div>

            {/* State and Country */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Provincia/Stato"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                disabled={loading}
                placeholder="Es. MI (opzionale)"
              />
              <Input
                label="Paese"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                error={formErrors.country}
                disabled={loading}
                placeholder="Es. Italia"
              />
            </div>

            {/* Default Address */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                Imposta come indirizzo predefinito
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Salvataggio...</span>
                  </div>
                ) : (
                  address ? 'Aggiorna' : 'Crea'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;