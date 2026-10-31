"""
Shared views used across the Brightloop API.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class HealthCheckView(APIView):
    """
    GET /api/v1/health/
    Returns a simple status payload confirming the API is reachable.
    No authentication required.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "version": "v1"})
