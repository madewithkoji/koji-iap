import fetch from 'node-fetch';
import { Headers } from 'request';

export type UserToken = string;
export interface IapReceipt {
  receiptId: string;
  productId: string;
  attributes: {[index: string]: any};
  datePurchased: Date;
}

export default class Iap {
  private readonly projectId?: string;
  private readonly projectToken?: string;

  private userToken?: string;

  private tokenCallbacks: ((userToken: UserToken) => void)[] = [];
  private purchaseCallbacks: ((success: boolean, userToken: UserToken) => void)[] = [];

  constructor(projectId?: string, projectToken?: string) {
    this.projectId = projectId;
    this.projectToken = projectToken;

    // If we're in a frame, register listeners for async callbacks
    try {
      if (window && window.parent) {
        window.addEventListener('message', ({ data }) => {
          const { event } = data;
          if (event === 'KojiIap.TokenCreated') {
            try {
              this.userToken = data.token;
              this.tokenCallbacks.forEach((callback) => {
                callback(data.userToken);
              });
              this.tokenCallbacks = [];
            } catch (err) {
              console.log(err);
            }
          }

          if (event === 'KojiIap.PurchaseFinished') {
            try {
              this.userToken = data.userToken;
              this.purchaseCallbacks.forEach((callback) => {
                callback(data.success, data.userToken);
              });
              this.purchaseCallbacks = [];
            } catch (err) {
              console.log(err);
            }
          }
        });
      }
    } catch (err) {}
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public/frontend methods
  //////////////////////////////////////////////////////////////////////////////

  // Ask Koji for a token identifying the current user, which can be used to
  // resolve a current user's purchases
  public getToken(callback: (userToken: UserToken) => void, forceRefresh: boolean = false) {
    if (this.userToken && !forceRefresh) {
      callback(this.userToken);
      return;
    }

    this.tokenCallbacks.push(callback);

    try {
      if (window && window.parent) {
        window.parent.postMessage({
          _kojiEventName: '@@koji/iap/getToken',
        }, '*');
      }
    } catch {}
    return '';
  }

  // Ask Koji to prompt the user to make a purchase
  public promptPurchase(
    sku: string,
    callback: (success: boolean, userToken: UserToken) => void,
  ) {
    this.purchaseCallbacks.push(callback);

    try {
      if (window && window.parent) {
        window.parent.postMessage({
          _kojiEventName: '@@koji/iap/promptPurchase',
          sku,
        }, '*');
      }
    } catch {}
  }

  //////////////////////////////////////////////////////////////////////////////
  // Backend/validation methods
  //////////////////////////////////////////////////////////////////////////////
  public async resolveReceipts(userToken: UserToken): Promise<IapReceipt[]> {
    try {
      const request = await fetch(
        this.buildUri('/v1/iap/consumer/resolveReceipts'),
        {
          method: 'POST',
          headers: this.getHeaders(userToken),
        },
      );
      const { receipts } = await request.json();
      return receipts;
    } catch (err) {
      return [];
    }
  }

  public async updateReceipt(receiptId: string, attributes: {[index: string]: any}): Promise<any> {
    try {
      await fetch(
        this.buildUri('/v1/iap/consumer/updateReceiptAttributes'),
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            receiptId,
            attributes,
          }),
        },
      );
    } catch (err) {
      throw new Error('Service error');
    }
  }

  private getHeaders(userToken?: UserToken): Headers {
    const headers: Headers = {
      'Content-Type': 'application/json',
      'X-Koji-Project-Id': this.projectId,
      'X-Koji-Project-Token': this.projectToken,
    };

    if (userToken) {
      headers['X-Koji-Iap-Callback-Token'] = userToken;
    }
    return headers;
  }

  private buildUri(path: string): string {
    if (process.env.NODE_TEST) {
      return `http://localhost:3129${path}`;
    }
    return `https://rest.api.gokoji.com${path}`;
  }
}
