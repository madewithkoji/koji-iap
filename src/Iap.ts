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
  private readonly appId: string;
  private readonly appToken?: string;

  private userToken?: string;

  private tokenCallbacks: ((userToken: UserToken) => void)[] = [];
  private purchaseCallbacks: ((success: boolean, userToken: UserToken) => void)[] = [];

  constructor(appId: string, appToken?: string) {
    this.appId = appId;
    this.appToken = appToken;

    // If we're in a frame, register listeners for async callbacks
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
            this.purchaseCallbacks.forEach((callback) => {
              if (!this.userToken) {
                return;
              }
              callback(data.success, this.userToken);
            });
            this.purchaseCallbacks = [];
          } catch (err) {
            console.log(err);
          }
        }
      });
    }
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

    if (window.parent) {
      window.parent.postMessage({
        _kojiEventName: '@@koji/iap/getToken',
      }, '*');
    }
    return '';
  }

  // Ask Koji to prompt the user to make a purchase
  public promptPurchase(
    sku: string,
    callback: (success: boolean, userToken: UserToken) => void,
  ) {
    this.purchaseCallbacks.push(callback);

    if (window.parent) {
      window.parent.postMessage({
        _kojiEventName: '@@koji/iap/promptPurchase',
        sku,
      }, '*');
    }
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
      'X-Koji-App-Id': this.appId,
      'X-Koji-App-Token': this.appToken,
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
