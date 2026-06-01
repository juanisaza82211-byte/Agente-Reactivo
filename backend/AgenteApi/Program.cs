using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AgenteDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("AgenteDb") ?? "Data Source=agente.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AgenteDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");

app.MapGet("/", () => Results.Ok(new
{
    nombre = "Agente reactivo de invernadero",
    descripcion = "Evalua sensores y reacciona con reglas simples para cuidar un cultivo.",
    acciones = AgenteInvernadero.AccionesDisponibles
}));

app.MapGet("/api/agente/acciones", () => Results.Ok(AgenteInvernadero.AccionesDisponibles));

app.MapGet("/api/agente/historial", async (AgenteDbContext db) =>
{
    var historial = await db.Decisiones
        .OrderByDescending(decision => decision.Fecha)
        .Take(25)
        .ToListAsync();

    return Results.Ok(historial);
});

app.MapGet("/api/agente/estadisticas", async (AgenteDbContext db) =>
{
    var decisiones = await db.Decisiones.ToListAsync();

    var estadisticas = decisiones
        .GroupBy(decision => decision.Accion)
        .Select(grupo => new { accion = grupo.Key, total = grupo.Count() })
        .OrderByDescending(item => item.total)
        .ToList();

    return Results.Ok(new
    {
        totalDecisiones = decisiones.Count,
        acciones = estadisticas,
        ultimaDecision = decisiones.OrderByDescending(decision => decision.Fecha).FirstOrDefault()
    });
});

app.MapPost("/api/agente/evaluar", async (LecturaSensor lectura, AgenteDbContext db) =>
{
    var decision = AgenteInvernadero.Evaluar(lectura);
    db.Decisiones.Add(decision);
    await db.SaveChangesAsync();

    return Results.Created($"/api/agente/historial/{decision.Id}", decision);
});

app.MapPost("/api/agente/simular", async (AgenteDbContext db) =>
{
    var lectura = LecturaSensor.CrearAleatoria();
    var decision = AgenteInvernadero.Evaluar(lectura);
    db.Decisiones.Add(decision);
    await db.SaveChangesAsync();

    return Results.Created($"/api/agente/historial/{decision.Id}", decision);
});

app.Run();

public sealed class AgenteDbContext(DbContextOptions<AgenteDbContext> options) : DbContext(options)
{
    public DbSet<DecisionAgente> Decisiones => Set<DecisionAgente>();
}

public sealed class LecturaSensor
{
    public double Temperatura { get; set; }
    public double HumedadSuelo { get; set; }
    public double Luz { get; set; }
    public double HumedadAmbiente { get; set; }
    public bool HayMovimiento { get; set; }

    public static LecturaSensor CrearAleatoria() => new()
    {
        Temperatura = Random.Shared.Next(12, 38),
        HumedadSuelo = Random.Shared.Next(10, 91),
        Luz = Random.Shared.Next(5, 101),
        HumedadAmbiente = Random.Shared.Next(35, 96),
        HayMovimiento = Random.Shared.Next(0, 5) == 0
    };
}

public sealed class DecisionAgente
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public double Temperatura { get; set; }
    public double HumedadSuelo { get; set; }
    public double Luz { get; set; }
    public double HumedadAmbiente { get; set; }
    public bool HayMovimiento { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
    public string Prioridad { get; set; } = "Media";
}

public static class AgenteInvernadero
{
    public static readonly string[] AccionesDisponibles =
    [
        "Activar riego",
        "Encender ventilacion",
        "Encender calefaccion",
        "Encender luces",
        "Activar alarma",
        "Abrir sombreado"
    ];

    public static DecisionAgente Evaluar(LecturaSensor lectura)
    {
        var (accion, motivo, prioridad) = lectura switch
        {
            { HayMovimiento: true } => ("Activar alarma", "Se detecto movimiento no autorizado cerca del cultivo.", "Alta"),
            { HumedadSuelo: < 35 } => ("Activar riego", "La humedad del suelo esta por debajo del umbral seguro.", "Alta"),
            { Temperatura: > 30 } => ("Encender ventilacion", "La temperatura es alta y puede estresar las plantas.", "Alta"),
            { Temperatura: < 18 } => ("Encender calefaccion", "La temperatura es baja para el crecimiento estable.", "Media"),
            { Luz: < 35 } => ("Encender luces", "La iluminacion disponible es insuficiente.", "Media"),
            { Luz: > 85, Temperatura: > 26 } => ("Abrir sombreado", "Hay demasiada luz junto con temperatura elevada.", "Media"),
            _ => ("Mantener monitoreo", "Las condiciones estan dentro del rango esperado.", "Baja")
        };

        return new DecisionAgente
        {
            Fecha = DateTime.UtcNow,
            Temperatura = lectura.Temperatura,
            HumedadSuelo = lectura.HumedadSuelo,
            Luz = lectura.Luz,
            HumedadAmbiente = lectura.HumedadAmbiente,
            HayMovimiento = lectura.HayMovimiento,
            Accion = accion,
            Motivo = motivo,
            Prioridad = prioridad
        };
    }
}
