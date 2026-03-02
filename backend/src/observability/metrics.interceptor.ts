import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ObservabilityService } from './observability.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly observabilityService: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<any>();
    const response = http.getResponse<any>();
    const routePath = request.route?.path ?? request.path ?? request.url;
    const route = `${request.method} ${routePath}`;
    const stop = this.observabilityService.startTimer(request.method, route);

    return next.handle().pipe(
      tap(() => {
        stop(String(response?.statusCode ?? 200));
      }),
      catchError((error) => {
        stop(String(response?.statusCode ?? 500));
        return throwError(() => error);
      })
    );
  }
}
