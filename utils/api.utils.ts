import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * API Helper utility class for common API operations
 */
export class ApiUtils {
  
  /**
   * Makes a GET request to the specified URL
   * @param url - The endpoint URL
   * @param config - Optional Axios request configuration
   * @returns Promise with the response
   */
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await axios.get<T>(url, config);
  }

  /**
   * Makes a POST request to the specified URL
   * @param url - The endpoint URL
   * @param data - The data to send in the request body
   * @param config - Optional Axios request configuration
   * @returns Promise with the response
   */
  static async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await axios.post<T>(url, data, config);
  }

  /**
   * Makes a PUT request to the specified URL
   * @param url - The endpoint URL
   * @param data - The data to send in the request body
   * @param config - Optional Axios request configuration
   * @returns Promise with the response
   */
  static async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await axios.put<T>(url, data, config);
  }

  /**
   * Makes a PATCH request to the specified URL
   * @param url - The endpoint URL
   * @param data - The data to send in the request body
   * @param config - Optional Axios request configuration
   * @returns Promise with the response
   */
  static async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await axios.patch<T>(url, data, config);
  }

  /**
   * Makes a DELETE request to the specified URL
   * @param url - The endpoint URL
   * @param config - Optional Axios request configuration
   * @returns Promise with the response
   */
  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return await axios.delete<T>(url, config);
  }

  /**
   * Creates default headers for requests
   * @param token - Optional authentication token
   * @returns Headers object
   */
  static createHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handles and processes API errors
   * @param error - The error object
   * @returns Formatted error object
   */
  static handleApiError(error: any): any {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        request: error.request,
        message: 'No response received from the server'
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      return {
        message: error.message,
        error: error
      };
    }
  }
}