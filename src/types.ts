export interface FoodItem {
  id: string;
  familyId: string;
  name: string;
  category: 'fridge' | 'freezer';
  purchaseDate: string;
  expiryDays: number;
  addedBy: string;
  addedByName: string;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  ownerUid: string;
  members: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  familyId?: string;
}
